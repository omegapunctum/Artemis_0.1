import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-serialization-contract")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")

from app.auth.service import SessionLocal, User, active_refresh_tokens, init_db as init_auth_db  # noqa: E402
from app.drafts.service import Draft, init_db as init_drafts_db  # noqa: E402


class SerializationContractTests(unittest.TestCase):
    SERVER_PORT = 8023
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
        init_auth_db()
        init_drafts_db()
        env = os.environ.copy()
        cls.server = subprocess.Popen(
            ["uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", str(cls.SERVER_PORT), "--log-level", "warning"],
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
        self.user_session = requests.Session()
        self.mod_session = requests.Session()

    def tearDown(self):
        self.db.close()
        active_refresh_tokens.clear()
        self.user_session.close()
        self.mod_session.close()

    def _register_login(self, session: requests.Session, email: str, password: str = "password123") -> str:
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

    def test_drafts_and_queue_serialization_contains_flatten_and_rejection_reason(self):
        user_email = f"user-{uuid4().hex}@example.com"
        user_token = self._register_login(self.user_session, user_email)
        user_headers = {"Authorization": f"Bearer {user_token}"}

        created = self.user_session.post(
            f"{self.BASE_URL}/api/drafts",
            headers=user_headers,
            json={
                "name_ru": "Serialization Draft",
                "date_start": "2026-01-01",
                "source_url": "https://example.com/source",
                "description": "desc",
                "latitude": 55.75,
                "longitude": 37.61,
            },
            timeout=5,
        )
        self.assertEqual(created.status_code, 201)
        draft_id = created.json()["id"]

        submitted = self.user_session.post(f"{self.BASE_URL}/api/drafts/{draft_id}/submit", headers=user_headers, timeout=5)
        self.assertEqual(submitted.status_code, 200)

        # queue contract for pending draft
        mod_email = f"moderator-{uuid4().hex}@example.com"
        self._register_login(self.mod_session, mod_email)
        self._promote_admin(mod_email)
        mod_login = self.mod_session.post(
            f"{self.BASE_URL}/api/auth/login",
            json={"email": mod_email, "password": "password123"},
            timeout=5,
        )
        self.assertEqual(mod_login.status_code, 200)
        mod_headers = {"Authorization": f"Bearer {mod_login.json()['access_token']}"}

        queue = self.mod_session.get(f"{self.BASE_URL}/api/moderation/queue", headers=mod_headers, timeout=5)
        self.assertEqual(queue.status_code, 200)
        queue_items = queue.json()
        self.assertTrue(queue_items)
        queue_item = next(item for item in queue_items if item["id"] == draft_id)

        for field in ("name_ru", "layer_id", "date_start", "coords", "rejection_reason", "payload", "status"):
            self.assertIn(field, queue_item)
        self.assertIsNone(queue_item["rejection_reason"])

        # reject with reason and verify drafts list contract
        rejected = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_id}/reject",
            headers=mod_headers,
            json={"reason": "Needs revision"},
            timeout=5,
        )
        self.assertEqual(rejected.status_code, 200)

        drafts_list = self.user_session.get(f"{self.BASE_URL}/api/drafts/my", headers=user_headers, timeout=5)
        self.assertEqual(drafts_list.status_code, 200)
        drafts = drafts_list.json()
        item = next(d for d in drafts if d["id"] == draft_id)

        for field in ("name_ru", "layer_id", "date_start", "coords", "rejection_reason", "payload", "status"):
            self.assertIn(field, item)
        self.assertEqual(item["rejection_reason"], "Needs revision")


if __name__ == "__main__":
    unittest.main()
