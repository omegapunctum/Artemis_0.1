import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-moderation-matrix")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")

from app.auth.service import SessionLocal, User, active_refresh_tokens, init_db as init_auth_db  # noqa: E402
from app.drafts.service import Draft, init_db as init_drafts_db  # noqa: E402


class ModerationApiMatrixTests(unittest.TestCase):
    SERVER_PORT = 8022
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
        db = SessionLocal()
        db.query(Draft).delete()
        db.query(User).delete()
        db.commit()
        db.close()
        active_refresh_tokens.clear()
        self.user_session = requests.Session()
        self.mod_session = requests.Session()
        seed_a = uuid4().hex
        seed_b = uuid4().hex
        self.user_session.headers.update(
            {"x-forwarded-for": f"10.{int(seed_a[0:2], 16)}.{int(seed_a[2:4], 16)}.{int(seed_a[4:6], 16)}"}
        )
        self.mod_session.headers.update(
            {"x-forwarded-for": f"10.{int(seed_b[0:2], 16)}.{int(seed_b[2:4], 16)}.{int(seed_b[4:6], 16)}"}
        )

    def tearDown(self):
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
        db = SessionLocal()
        try:
            user = db.query(User).filter(User.email == email).first()
            self.assertIsNotNone(user)
            user.is_admin = True
            db.commit()
        finally:
            db.close()

    def _create_and_submit_draft(self) -> tuple[int, dict]:
        email = f"user-{uuid4().hex}@example.com"
        token = self._register_login(self.user_session, email)
        headers = {"Authorization": f"Bearer {token}"}
        created = self.user_session.post(
            f"{self.BASE_URL}/api/drafts",
            headers=headers,
            json={
                "name_ru": "Matrix draft",
                "date_start": "2026-01-01",
                "source_url": "https://example.com/source",
                "description": "desc",
            },
            timeout=5,
        )
        self.assertEqual(created.status_code, 201, created.text)
        draft_id = created.json()["id"]
        submitted = self.user_session.post(f"{self.BASE_URL}/api/drafts/{draft_id}/submit", headers=headers, timeout=5)
        self.assertEqual(submitted.status_code, 200)
        return draft_id, headers

    def _moderator_headers(self) -> dict:
        email = f"moderator-{uuid4().hex}@example.com"
        self._register_login(self.mod_session, email)
        self._promote_admin(email)
        relogin = self.mod_session.post(
            f"{self.BASE_URL}/api/auth/login",
            json={"email": email, "password": "password123"},
            timeout=5,
        )
        self.assertEqual(relogin.status_code, 200)
        return {"Authorization": f"Bearer {relogin.json()['access_token']}"}

    def test_reject_matrix_non_moderator_missing_already_rejected(self):
        draft_id, user_headers = self._create_and_submit_draft()

        non_mod = self.user_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_id}/reject",
            headers=user_headers,
            json={"reason": "not allowed"},
            timeout=5,
        )
        self.assertEqual(non_mod.status_code, 403)
        self.assertTrue(non_mod.json().get("detail") or non_mod.json().get("error"))

        mod_headers = self._moderator_headers()
        missing = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/999999/reject",
            headers=mod_headers,
            json={"reason": "missing"},
            timeout=5,
        )
        self.assertEqual(missing.status_code, 404)
        self.assertTrue(missing.json().get("detail") or missing.json().get("error"))

        first_reject = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_id}/reject",
            headers=mod_headers,
            json={"reason": "duplicate"},
            timeout=5,
        )
        self.assertEqual(first_reject.status_code, 200)

        second_reject = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_id}/reject",
            headers=mod_headers,
            json={"reason": "again"},
            timeout=5,
        )
        self.assertEqual(second_reject.status_code, 409)
        payload = second_reject.json()
        self.assertTrue(payload.get("detail") or payload.get("error"))
        self.assertIn("request_id", payload)

    def test_reject_invalid_non_pending_state_returns_409(self):
        email = f"user-{uuid4().hex}@example.com"
        token = self._register_login(self.user_session, email)
        headers = {"Authorization": f"Bearer {token}"}
        created = self.user_session.post(
            f"{self.BASE_URL}/api/drafts",
            headers=headers,
            json={
                "name_ru": "Draft without submit",
                "date_start": "2026-01-01",
                "source_url": "https://example.com/source",
                "description": "desc",
            },
            timeout=5,
        )
        self.assertEqual(created.status_code, 201)
        draft_id = created.json()["id"]

        mod_headers = self._moderator_headers()
        reject_invalid = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_id}/reject",
            headers=mod_headers,
            json={"reason": "invalid state"},
            timeout=5,
        )
        self.assertEqual(reject_invalid.status_code, 409)
        payload = reject_invalid.json()
        self.assertTrue(payload.get("detail") or payload.get("error"))
        self.assertIn("request_id", payload)

    def test_approve_matrix_non_moderator_and_invalid_state(self):
        pending_draft_id, user_headers = self._create_and_submit_draft()

        non_mod = self.user_session.post(
            f"{self.BASE_URL}/api/moderation/{pending_draft_id}/approve",
            headers=user_headers,
            timeout=5,
        )
        self.assertEqual(non_mod.status_code, 403)
        self.assertTrue(non_mod.json().get("detail") or non_mod.json().get("error"))

        email = f"owner-{uuid4().hex}@example.com"
        owner_token = self._register_login(self.user_session, email)
        owner_headers = {"Authorization": f"Bearer {owner_token}"}
        created = self.user_session.post(
            f"{self.BASE_URL}/api/drafts",
            headers=owner_headers,
            json={
                "name_ru": "Draft only",
                "date_start": "2026-01-01",
                "source_url": "https://example.com/source",
                "description": "desc",
            },
            timeout=5,
        )
        self.assertEqual(created.status_code, 201)
        draft_only_id = created.json()["id"]

        mod_headers = self._moderator_headers()
        invalid_state = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{draft_only_id}/approve",
            headers=mod_headers,
            timeout=5,
        )
        self.assertEqual(invalid_state.status_code, 409)
        payload = invalid_state.json()
        self.assertTrue(payload.get("detail") or payload.get("error"))
        self.assertIn("request_id", payload)


if __name__ == "__main__":
    unittest.main()
