import os
import subprocess
import tempfile
import time
import unittest
from pathlib import Path
from uuid import uuid4

import requests

from tests.db_rebind_helper import rebind_test_db

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-response-contract")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")


EXPECTED_ITEM_KEYS = {
    "id",
    "title",
    "description",
    "geometry",
    "image_url",
    "payload",
    "status",
    "publish_status",
    "airtable_record_id",
    "published_at",
    "created_at",
    "updated_at",
    "name_ru",
    "name_en",
    "layer_id",
    "layer_type",
    "date_start",
    "date_end",
    "longitude",
    "latitude",
    "coords",
    "coordinates_confidence",
    "title_short",
    "source_url",
    "tags",
    "rejection_reason",
}


class ResponseContractTests(unittest.TestCase):
    SERVER_PORT = 8024
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
        cls._tmpdir = tempfile.TemporaryDirectory(prefix="response-contract-")
        cls._db_path = Path(cls._tmpdir.name) / "response-contract.db"
        rebound = rebind_test_db(cls._db_path)
        cls.auth_service = rebound.auth_service
        cls.drafts_service = rebound.drafts_service
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
        cls._tmpdir.cleanup()

    def setUp(self):
        rebound = rebind_test_db(self._db_path)
        self.auth_service = rebound.auth_service
        self.drafts_service = rebound.drafts_service
        db = self.auth_service.SessionLocal()
        db.query(self.drafts_service.Draft).delete()
        db.query(self.auth_service.User).delete()
        db.commit()
        db.close()
        self.auth_service.reset_refresh_sessions_for_tests()
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
        self.auth_service.reset_refresh_sessions_for_tests()
        self.user_session.close()
        self.mod_session.close()

    def _register_login(self, session: requests.Session, email: str, password: str = "password123") -> str:
        register = session.post(f"{self.BASE_URL}/api/auth/register", json={"email": email, "password": password}, timeout=5)
        self.assertEqual(register.status_code, 201)
        login = session.post(f"{self.BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=5)
        self.assertEqual(login.status_code, 200)
        return login.json()["access_token"]

    def _promote_admin(self, email: str):
        db = self.auth_service.SessionLocal()
        try:
            user = db.query(self.auth_service.User).filter(self.auth_service.User.email == email).first()
            self.assertIsNotNone(user)
            user.is_admin = True
            db.commit()
        finally:
            db.close()

    def _create_draft(self, headers: dict, name_ru: str, source_url: str, description: str = "desc") -> int:
        created = self.user_session.post(
            f"{self.BASE_URL}/api/drafts",
            headers=headers,
            json={
                "name_ru": name_ru,
                "date_start": "2026-01-01",
                "source_url": source_url,
                "description": description,
                "latitude": 55.75,
                "longitude": 37.61,
                "tags": ["contract", "shape"],
            },
            timeout=5,
        )
        self.assertEqual(created.status_code, 201, created.text)
        return created.json()["id"]

    def assert_response_shape(self, item: dict, expected_keys: set[str]):
        self.assertEqual(set(item.keys()), expected_keys, "Response keys changed; snapshot guard failed")

    def assert_item_types(self, item: dict):
        self.assertIsInstance(item["id"], int)
        self.assertIsInstance(item["title"], str)
        self.assertTrue(isinstance(item["description"], str) or item["description"] is None)
        self.assertTrue(isinstance(item["geometry"], dict) or item["geometry"] is None)
        self.assertTrue(isinstance(item["payload"], dict) or item["payload"] is None)
        self.assertIsInstance(item["status"], str)
        self.assertIsInstance(item["publish_status"], str)
        self.assertTrue(isinstance(item["created_at"], str) or item["created_at"] is None)
        self.assertTrue(isinstance(item["updated_at"], str) or item["updated_at"] is None)
        self.assertTrue(isinstance(item["coords"], list) or item["coords"] is None)
        self.assertTrue(isinstance(item["rejection_reason"], str) or item["rejection_reason"] is None)

    def test_drafts_list_shape_contract_and_rejection_reason_presence(self):
        user_email = f"user-{uuid4().hex}@example.com"
        user_token = self._register_login(self.user_session, user_email)
        user_headers = {"Authorization": f"Bearer {user_token}"}

        rejected_id = self._create_draft(user_headers, "Rejected candidate", "https://example.com/rejected")
        clean_id = self._create_draft(user_headers, "Clean candidate", "https://example.com/clean")

        submitted = self.user_session.post(f"{self.BASE_URL}/api/drafts/{rejected_id}/submit", headers=user_headers, timeout=5)
        self.assertEqual(submitted.status_code, 200)

        mod_email = f"moderator-{uuid4().hex}@example.com"
        self._register_login(self.mod_session, mod_email)
        self._promote_admin(mod_email)
        relogin = self.mod_session.post(
            f"{self.BASE_URL}/api/auth/login",
            json={"email": mod_email, "password": "password123"},
            timeout=5,
        )
        self.assertEqual(relogin.status_code, 200)
        mod_headers = {"Authorization": f"Bearer {relogin.json()['access_token']}"}

        rejected = self.mod_session.post(
            f"{self.BASE_URL}/api/moderation/{rejected_id}/reject",
            headers=mod_headers,
            json={"reason": "Needs source fix"},
            timeout=5,
        )
        self.assertEqual(rejected.status_code, 200)

        drafts_response = self.user_session.get(f"{self.BASE_URL}/api/drafts/my", headers=user_headers, timeout=5)
        self.assertEqual(drafts_response.status_code, 200)
        drafts = drafts_response.json()
        self.assertIsInstance(drafts, list)
        self.assertGreaterEqual(len(drafts), 2)

        by_id = {item["id"]: item for item in drafts}
        self.assertIn(rejected_id, by_id)
        self.assertIn(clean_id, by_id)

        for item in by_id.values():
            self.assert_response_shape(item, EXPECTED_ITEM_KEYS)
            self.assert_item_types(item)
            self.assertTrue(isinstance(item["payload"], dict) or item["payload"] is None)
            if isinstance(item["payload"], dict):
                self.assertIn("name_ru", item["payload"])
                self.assertIn("date_start", item["payload"])
                self.assertIn("source_url", item["payload"])

        self.assertEqual(by_id[rejected_id]["rejection_reason"], "Needs source fix")
        self.assertIsNone(by_id[clean_id]["rejection_reason"])

    def test_moderation_queue_shape_contract_and_item_consistency(self):
        owner_email = f"owner-{uuid4().hex}@example.com"
        owner_token = self._register_login(self.user_session, owner_email)
        owner_headers = {"Authorization": f"Bearer {owner_token}"}

        first_id = self._create_draft(owner_headers, "Queue one", "https://example.com/q1")
        second_id = self._create_draft(owner_headers, "Queue two", "https://example.com/q2")

        for draft_id in (first_id, second_id):
            submit = self.user_session.post(f"{self.BASE_URL}/api/drafts/{draft_id}/submit", headers=owner_headers, timeout=5)
            self.assertEqual(submit.status_code, 200)

        mod_email = f"moderator-{uuid4().hex}@example.com"
        self._register_login(self.mod_session, mod_email)
        self._promote_admin(mod_email)
        relogin = self.mod_session.post(
            f"{self.BASE_URL}/api/auth/login",
            json={"email": mod_email, "password": "password123"},
            timeout=5,
        )
        self.assertEqual(relogin.status_code, 200)
        mod_headers = {"Authorization": f"Bearer {relogin.json()['access_token']}"}

        queue_response = self.mod_session.get(f"{self.BASE_URL}/api/moderation/queue", headers=mod_headers, timeout=5)
        self.assertEqual(queue_response.status_code, 200)
        queue = queue_response.json()
        self.assertIsInstance(queue, list)
        self.assertGreaterEqual(len(queue), 2)

        selected = [item for item in queue if item["id"] in {first_id, second_id}]
        self.assertEqual(len(selected), 2)

        expected_key_snapshot = None
        for item in selected:
            self.assert_response_shape(item, EXPECTED_ITEM_KEYS)
            self.assert_item_types(item)
            self.assertEqual(item["status"], "pending")
            self.assertIsNone(item["rejection_reason"])

            key_snapshot = set(item.keys())
            if expected_key_snapshot is None:
                expected_key_snapshot = key_snapshot
            self.assertEqual(key_snapshot, expected_key_snapshot, "Queue items must keep identical shape")


if __name__ == "__main__":
    unittest.main()
