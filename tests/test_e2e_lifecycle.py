import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-e2e-lifecycle")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")

from app.auth.service import SessionLocal, User, active_refresh_tokens, init_db as init_auth_db  # noqa: E402
from app.drafts.service import Draft, init_db as init_drafts_db  # noqa: E402


class E2ELifecycleTests(unittest.TestCase):
    SERVER_PORT = 8021
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
        init_auth_db()
        init_drafts_db()
        env = os.environ.copy()
        cls.server = subprocess.Popen(
            [
                "uvicorn",
                "app.main:app",
                "--host",
                "127.0.0.1",
                "--port",
                str(cls.SERVER_PORT),
                "--log-level",
                "warning",
            ],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(50):
            try:
                response = requests.get(f"{cls.BASE_URL}/api/health", timeout=0.5)
                if response.status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(0.2)
        else:
            raise RuntimeError("Failed to start test server")

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def setUp(self):
        init_auth_db()
        init_drafts_db()
        self.db = SessionLocal()
        self.db.query(Draft).delete()
        self.db.query(User).delete()
        self.db.commit()
        active_refresh_tokens.clear()
        self.session = requests.Session()
        self.mod_session = requests.Session()

    def tearDown(self):
        self.db.close()
        active_refresh_tokens.clear()
        self.session.close()
        self.mod_session.close()

    def _register_login(self, session: requests.Session, *, email: str, password: str = "password123") -> str:
        register = session.post(f"{self.BASE_URL}/api/auth/register", json={"email": email, "password": password}, timeout=5)
        self.assertEqual(register.status_code, 201)
        login = session.post(f"{self.BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=5)
        self.assertEqual(login.status_code, 200)
        return login.json()["access_token"]

    def _promote_admin(self, email: str):
        user = self.db.query(User).filter(User.email == email).first()
        self.assertIsNotNone(user)
        user.is_admin = True
        self.db.commit()

    def test_create_submit_reject_update_resubmit_lifecycle(self):
        user_email = f"user-{uuid4().hex}@example.com"
        user_token = self._register_login(self.session, email=user_email)
        user_headers = {"Authorization": f"Bearer {user_token}"}

        create_payload = {
            "name_ru": "Lifecycle draft",
            "date_start": "2026-01-01",
            "source_url": "https://example.com/source",
            "description": "Initial",
            "latitude": 55.75,
            "longitude": 37.61,
        }
        created = self.session.post(f"{self.BASE_URL}/api/drafts", json=create_payload, headers=user_headers, timeout=5)
        self.assertEqual(created.status_code, 201)
        created_data = created.json()
        draft_id = created_data["id"]
        self.assertEqual(created_data["status"], "draft")

        submitted = self.session.post(f"{self.BASE_URL}/api/drafts/{draft_id}/submit", headers=user_headers, timeout=5)
        self.assertEqual(submitted.status_code, 200)
        self.assertEqual(submitted.json()["status"], "pending")

        mod_email = f"moderator-{uuid4().hex}@example.com"
        self._register_login(self.mod_session, email=mod_email)
        self._promote_admin(mod_email)
        mod_login = self.mod_session.post(
            f"{self.BASE_URL}/api/auth/login",
            json={"email": mod_email, "password": "password123"},
            timeout=5,
        )
        self.assertEqual(mod_login.status_code, 200)
        mod_headers = {"Authorization": f"Bearer {mod_login.json()['access_token']}"}

        rejected = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_id}/reject",
            json={"reason": "X"},
            headers=mod_headers,
            timeout=5,
        )
        self.assertEqual(rejected.status_code, 200)
        rejected_data = rejected.json()
        self.assertEqual(rejected_data["status"], "rejected")
        self.assertEqual(rejected_data.get("rejection_reason"), "X")

        updated = self.session.put(
            f"{self.BASE_URL}/api/drafts/{draft_id}",
            json={"description": "Updated after reject"},
            headers=user_headers,
            timeout=5,
        )
        self.assertEqual(updated.status_code, 200)
        updated_data = updated.json()
        # Current contract: update in rejected keeps status rejected (editable rejected state).
        self.assertEqual(updated_data["status"], "rejected")
        self.assertEqual(updated_data.get("rejection_reason"), "X")
        self.assertEqual(updated_data["payload"]["description"], "Updated after reject")
        for flat_field in ("name_ru", "date_start", "coords", "payload"):
            self.assertIn(flat_field, updated_data)

        resubmitted = self.session.post(f"{self.BASE_URL}/api/drafts/{draft_id}/submit", headers=user_headers, timeout=5)
        self.assertEqual(resubmitted.status_code, 200)
        resubmitted_data = resubmitted.json()
        self.assertEqual(resubmitted_data["status"], "pending")
        # Fix current behavior as contract: reason persists through update/resubmit unless explicitly changed.
        self.assertEqual(resubmitted_data.get("rejection_reason"), "X")
        self.assertEqual(resubmitted_data["payload"]["description"], "Updated after reject")
        for flat_field in ("name_ru", "date_start", "coords", "payload"):
            self.assertIn(flat_field, resubmitted_data)

        # Overwrite policy contract: blank reason on a later reject does not clear existing non-empty reason.
        rejected_blank = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_id}/reject",
            json={"reason": "   "},
            headers=mod_headers,
            timeout=5,
        )
        self.assertEqual(rejected_blank.status_code, 200)
        rejected_blank_data = rejected_blank.json()
        self.assertEqual(rejected_blank_data["status"], "rejected")
        self.assertEqual(rejected_blank_data.get("rejection_reason"), "X")


if __name__ == "__main__":
    unittest.main()
