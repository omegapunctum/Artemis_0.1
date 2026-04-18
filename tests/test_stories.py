import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

from app.auth.service import DATABASE_URL, SessionLocal, User, reset_refresh_sessions_for_tests, init_db as init_auth_db
from app.drafts.service import Draft, init_db as init_drafts_db
from app.research_slices.service import ResearchSlice, init_db as init_research_slices_db
from app.stories.service import Story, init_db as init_stories_db
from tests.db_rebind_helper import build_clean_test_env

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-stories")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")


class StoriesApiTests(unittest.TestCase):
    SERVER_PORT = 8033
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
        init_auth_db()
        init_drafts_db()
        init_research_slices_db()
        init_stories_db()
        env = build_clean_test_env(
            {
                "APP_ENV": "development",
                "AUTH_SECRET_KEY": os.environ.get("AUTH_SECRET_KEY", "test-secret-stories"),
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
        init_stories_db()
        db = SessionLocal()
        db.query(Story).delete()
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

    def _create_slice(self, headers: dict[str, str], title: str = "Slice A") -> str:
        payload = {
            "title": title,
            "description": "Context",
            "feature_refs": [{"feature_id": "recA"}],
            "time_range": {"start": 1500, "end": 1600, "mode": "range"},
            "view_state": {
                "center": [10.0, 20.0],
                "zoom": 6,
                "enabled_layer_ids": ["layer_a"],
                "active_quick_layer_ids": ["layer_a"],
                "selected_feature_id": "recA",
            },
            "annotations": [],
        }
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=payload, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def test_create_story_success(self):
        headers = self._register_login(f"story-create-{uuid4().hex}@example.com")
        s1 = self._create_slice(headers, "Slice 1")
        s2 = self._create_slice(headers, "Slice 2")

        response = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "  My Story  ", "description": "  Path  ", "slice_ids": [s1, s2]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(response.status_code, 201, response.text)
        body = response.json()
        self.assertEqual(body["title"], "My Story")
        self.assertEqual(body["description"], "Path")
        self.assertEqual(body["slice_ids"], [s1, s2])
        self.assertEqual(body["visibility"], "private")

    def test_invalid_slice_ids_missing_or_foreign(self):
        owner_headers = self._register_login(f"story-owner-{uuid4().hex}@example.com")
        outsider_headers = self._register_login(f"story-outsider-{uuid4().hex}@example.com")

        owner_slice = self._create_slice(owner_headers, "Owner Slice")
        outsider_slice = self._create_slice(outsider_headers, "Outsider Slice")

        missing = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story", "description": "", "slice_ids": ["missing-id"]},
            headers=owner_headers,
            timeout=5,
        )
        self.assertEqual(missing.status_code, 422)

        foreign = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story", "description": "", "slice_ids": [owner_slice, outsider_slice]},
            headers=owner_headers,
            timeout=5,
        )
        self.assertEqual(foreign.status_code, 422)

    def test_list_returns_only_owner_stories(self):
        headers_a = self._register_login(f"story-a-{uuid4().hex}@example.com")
        headers_b = self._register_login(f"story-b-{uuid4().hex}@example.com")

        s1 = self._create_slice(headers_a, "A Slice")
        s2 = self._create_slice(headers_b, "B Slice")

        create_a = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story A", "description": "", "slice_ids": [s1]},
            headers=headers_a,
            timeout=5,
        )
        self.assertEqual(create_a.status_code, 201)

        create_b = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story B", "description": "", "slice_ids": [s2]},
            headers=headers_b,
            timeout=5,
        )
        self.assertEqual(create_b.status_code, 201)

        listed = self.session.get(f"{self.BASE_URL}/api/stories", headers=headers_a, timeout=5)
        self.assertEqual(listed.status_code, 200)
        body = listed.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["title"], "Story A")
        self.assertEqual(body[0]["step_count"], 1)

    def test_get_by_id_owner_only(self):
        owner_headers = self._register_login(f"story-get-owner-{uuid4().hex}@example.com")
        outsider_headers = self._register_login(f"story-get-outsider-{uuid4().hex}@example.com")
        s1 = self._create_slice(owner_headers, "Owner Slice")

        created = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story", "description": "", "slice_ids": [s1]},
            headers=owner_headers,
            timeout=5,
        )
        self.assertEqual(created.status_code, 201)
        story_id = created.json()["id"]

        owner_get = self.session.get(f"{self.BASE_URL}/api/stories/{story_id}", headers=owner_headers, timeout=5)
        self.assertEqual(owner_get.status_code, 200)

        outsider_get = self.session.get(f"{self.BASE_URL}/api/stories/{story_id}", headers=outsider_headers, timeout=5)
        self.assertEqual(outsider_get.status_code, 404)

    def test_patch_reorder(self):
        headers = self._register_login(f"story-patch-{uuid4().hex}@example.com")
        s1 = self._create_slice(headers, "Slice 1")
        s2 = self._create_slice(headers, "Slice 2")

        created = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story", "description": "", "slice_ids": [s1, s2]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(created.status_code, 201)
        story_id = created.json()["id"]

        patched = self.session.patch(
            f"{self.BASE_URL}/api/stories/{story_id}",
            json={"slice_ids": [s2, s1], "title": "Updated Story"},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(patched.status_code, 200, patched.text)
        body = patched.json()
        self.assertEqual(body["slice_ids"], [s2, s1])
        self.assertEqual(body["title"], "Updated Story")

    def test_delete_story(self):
        headers = self._register_login(f"story-delete-{uuid4().hex}@example.com")
        s1 = self._create_slice(headers, "Slice")

        created = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story", "description": "", "slice_ids": [s1]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(created.status_code, 201)
        story_id = created.json()["id"]

        deleted = self.session.delete(f"{self.BASE_URL}/api/stories/{story_id}", headers=headers, timeout=5)
        self.assertEqual(deleted.status_code, 204)

        missing = self.session.get(f"{self.BASE_URL}/api/stories/{story_id}", headers=headers, timeout=5)
        self.assertEqual(missing.status_code, 404)

    def test_validation_errors(self):
        headers = self._register_login(f"story-validate-{uuid4().hex}@example.com")
        s1 = self._create_slice(headers, "Slice")

        empty_title = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "   ", "description": "", "slice_ids": [s1]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(empty_title.status_code, 422)

        empty_slice_ids = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story", "description": "", "slice_ids": []},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(empty_slice_ids.status_code, 422)

        duplicate_slice_ids = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": "Story", "description": "", "slice_ids": [s1, s1]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(duplicate_slice_ids.status_code, 422)


if __name__ == "__main__":
    unittest.main()
