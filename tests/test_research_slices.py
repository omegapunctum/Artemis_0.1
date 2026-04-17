import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

from app.auth.service import DATABASE_URL, SessionLocal, User, reset_refresh_sessions_for_tests, init_db as init_auth_db
from app.drafts.service import Draft, init_db as init_drafts_db
from app.research_slices.service import ResearchSlice, init_db as init_research_slices_db
from tests.db_rebind_helper import build_clean_test_env

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-research-slices")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")


class ResearchSlicesApiTests(unittest.TestCase):
    SERVER_PORT = 8031
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
        init_auth_db()
        init_drafts_db()
        init_research_slices_db()
        env = build_clean_test_env(
            {
                "APP_ENV": "development",
                "AUTH_SECRET_KEY": os.environ.get("AUTH_SECRET_KEY", "test-secret-research-slices"),
                "AUTH_DATABASE_URL": DATABASE_URL,
                "AUTH_SESSION_BACKEND": "memory",
            }
        )
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
        init_research_slices_db()
        db = SessionLocal()
        db.query(ResearchSlice).delete()
        db.query(Draft).delete()
        db.query(User).delete()
        db.commit()
        db.close()
        reset_refresh_sessions_for_tests()
        self.session = requests.Session()
        seed = uuid4().hex
        self.session.headers.update({"x-forwarded-for": f"10.{int(seed[0:2], 16)}.{int(seed[2:4], 16)}.{int(seed[4:6], 16)}"})

    def tearDown(self):
        reset_refresh_sessions_for_tests()
        self.session.close()

    def _register_login(self, email: str, password: str = "password123") -> dict[str, str]:
        register = self.session.post(
            f"{self.BASE_URL}/api/auth/register",
            json={"email": email, "password": password},
            timeout=5,
        )
        self.assertEqual(register.status_code, 201, register.text)

        login = self.session.post(
            f"{self.BASE_URL}/api/auth/login",
            json={"email": email, "password": password},
            timeout=5,
        )
        self.assertEqual(login.status_code, 200, login.text)
        token = login.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    @staticmethod
    def _payload() -> dict:
        return {
            "title": "  Test Slice  ",
            "description": "  Baseline context  ",
            "feature_refs": [{"feature_id": "recA"}, {"feature_id": "recB"}],
            "time_range": {"start": 1500, "end": 1750, "mode": "range"},
            "view_state": {
                "center": [12.4964, 41.9028],
                "zoom": 5.8,
                "enabled_layer_ids": ["renaissance_italy", "baroque_monarchies"],
                "active_quick_layer_ids": ["renaissance_italy"],
                "selected_feature_id": "recA",
            },
            "annotations": [
                {"id": "ann-1", "type": "fact", "text": "Known factual note", "feature_id": "recA"},
                {"id": "ann-2", "type": "interpretation", "text": "Interpretative note"},
                {"id": "ann-3", "type": "hypothesis", "text": "Hypothesis note"},
            ],
        }

    def test_create_get_patch_delete_research_slice_success(self):
        headers = self._register_login(f"slice-{uuid4().hex}@example.com")

        create = self.session.post(f"{self.BASE_URL}/api/research-slices", json=self._payload(), headers=headers, timeout=5)
        self.assertEqual(create.status_code, 201, create.text)
        created = create.json()
        self.assertIsInstance(created["id"], str)
        self.assertEqual(created["title"], "Test Slice")
        self.assertEqual(created["description"], "Baseline context")
        self.assertEqual(created["visibility"], "private")

        slice_id = created["id"]
        get_resp = self.session.get(f"{self.BASE_URL}/api/research-slices/{slice_id}", headers=headers, timeout=5)
        self.assertEqual(get_resp.status_code, 200, get_resp.text)
        loaded = get_resp.json()
        self.assertEqual(loaded["id"], slice_id)
        self.assertEqual(loaded["annotations"][2]["type"], "hypothesis")

        patch_resp = self.session.patch(
            f"{self.BASE_URL}/api/research-slices/{slice_id}",
            json={
                "title": "Updated",
                "description": "Updated context",
                "feature_refs": [{"feature_id": "recB"}],
                "view_state": {
                    "center": [10.0, 20.0],
                    "zoom": 7,
                    "enabled_layer_ids": ["baroque_monarchies"],
                    "active_quick_layer_ids": ["baroque_monarchies"],
                    "selected_feature_id": "recB",
                },
            },
            headers=headers,
            timeout=5,
        )
        self.assertEqual(patch_resp.status_code, 200, patch_resp.text)
        updated = patch_resp.json()
        self.assertEqual(updated["title"], "Updated")
        self.assertEqual(updated["feature_refs"], [{"feature_id": "recB"}])

        delete_resp = self.session.delete(f"{self.BASE_URL}/api/research-slices/{slice_id}", headers=headers, timeout=5)
        self.assertEqual(delete_resp.status_code, 204)

        missing = self.session.get(f"{self.BASE_URL}/api/research-slices/{slice_id}", headers=headers, timeout=5)
        self.assertEqual(missing.status_code, 404)

    def test_list_returns_only_owner_items_and_is_lightweight(self):
        headers_a = self._register_login(f"slice-a-{uuid4().hex}@example.com")
        headers_b = self._register_login(f"slice-b-{uuid4().hex}@example.com")

        create_a = self.session.post(f"{self.BASE_URL}/api/research-slices", json=self._payload(), headers=headers_a, timeout=5)
        self.assertEqual(create_a.status_code, 201)

        payload_b = self._payload()
        payload_b["title"] = "Second"
        create_b = self.session.post(f"{self.BASE_URL}/api/research-slices", json=payload_b, headers=headers_b, timeout=5)
        self.assertEqual(create_b.status_code, 201)

        listed = self.session.get(f"{self.BASE_URL}/api/research-slices", headers=headers_a, timeout=5)
        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["title"], "Test Slice")
        self.assertIn("feature_count", body[0])
        self.assertNotIn("feature_refs", body[0])
        self.assertNotIn("description", body[0])

    def test_unauthorized_returns_401(self):
        create = self.session.post(f"{self.BASE_URL}/api/research-slices", json=self._payload(), timeout=5)
        self.assertEqual(create.status_code, 401)

        listed = self.session.get(f"{self.BASE_URL}/api/research-slices", timeout=5)
        self.assertEqual(listed.status_code, 401)

    def test_non_owner_access_is_blocked(self):
        owner_headers = self._register_login(f"slice-owner-{uuid4().hex}@example.com")
        outsider_headers = self._register_login(f"slice-outsider-{uuid4().hex}@example.com")

        create = self.session.post(f"{self.BASE_URL}/api/research-slices", json=self._payload(), headers=owner_headers, timeout=5)
        self.assertEqual(create.status_code, 201)
        slice_id = create.json()["id"]

        outsider_get = self.session.get(f"{self.BASE_URL}/api/research-slices/{slice_id}", headers=outsider_headers, timeout=5)
        self.assertEqual(outsider_get.status_code, 404)

        outsider_delete = self.session.delete(f"{self.BASE_URL}/api/research-slices/{slice_id}", headers=outsider_headers, timeout=5)
        self.assertEqual(outsider_delete.status_code, 404)

    def test_validation_errors(self):
        headers = self._register_login(f"slice-validate-{uuid4().hex}@example.com")

        invalid_title = self._payload()
        invalid_title["title"] = "   "
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=invalid_title, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 422)

        invalid_feature_refs = self._payload()
        invalid_feature_refs["feature_refs"] = []
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=invalid_feature_refs, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 422)

        invalid_annotation = self._payload()
        invalid_annotation["annotations"][0]["type"] = "unknown"
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=invalid_annotation, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 422)

        invalid_time = self._payload()
        invalid_time["time_range"] = {"start": 1800, "end": 1700, "mode": "range"}
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=invalid_time, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 422)

        invalid_center = self._payload()
        invalid_center["view_state"]["center"] = [12.0]
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=invalid_center, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 422)


        created_valid = self.session.post(f"{self.BASE_URL}/api/research-slices", json=self._payload(), headers=headers, timeout=5)
        self.assertEqual(created_valid.status_code, 201)
        created_id = created_valid.json()["id"]
        incompatible_patch = self.session.patch(
            f"{self.BASE_URL}/api/research-slices/{created_id}",
            json={"feature_refs": [{"feature_id": "recB"}]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(incompatible_patch.status_code, 422)

        invalid_selected_ref = self._payload()
        invalid_selected_ref["view_state"]["selected_feature_id"] = "recZ"
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=invalid_selected_ref, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 422)

    def test_round_trip_shape_preservation(self):
        headers = self._register_login(f"slice-roundtrip-{uuid4().hex}@example.com")
        created = self.session.post(f"{self.BASE_URL}/api/research-slices", json=self._payload(), headers=headers, timeout=5)
        self.assertEqual(created.status_code, 201)
        slice_id = created.json()["id"]

        loaded = self.session.get(f"{self.BASE_URL}/api/research-slices/{slice_id}", headers=headers, timeout=5)
        self.assertEqual(loaded.status_code, 200)
        body = loaded.json()

        self.assertEqual([entry["feature_id"] for entry in body["feature_refs"]], ["recA", "recB"])
        self.assertEqual(body["time_range"], {"start": 1500, "end": 1750, "mode": "range"})
        self.assertEqual(body["view_state"]["center"], [12.4964, 41.9028])
        self.assertEqual([entry["type"] for entry in body["annotations"]], ["fact", "interpretation", "hypothesis"])
        self.assertEqual(body["visibility"], "private")


if __name__ == "__main__":
    unittest.main()
