import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

from app.auth.service import DATABASE_URL, SessionLocal, User, reset_refresh_sessions_for_tests, init_db as init_auth_db
from app.courses.service import Course, init_db as init_courses_db
from app.drafts.service import Draft, init_db as init_drafts_db
from app.research_slices.service import ResearchSlice, init_db as init_research_slices_db
from app.stories.service import Story, init_db as init_stories_db
from tests.db_rebind_helper import build_clean_test_env

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-explain-context")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")


class ExplainContextApiTests(unittest.TestCase):
    SERVER_PORT = 8035
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
        init_auth_db()
        init_drafts_db()
        init_research_slices_db()
        init_stories_db()
        init_courses_db()
        env = build_clean_test_env(
            {
                "APP_ENV": "development",
                "AUTH_SECRET_KEY": os.environ.get("AUTH_SECRET_KEY", "test-secret-explain-context"),
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
        init_courses_db()
        db = SessionLocal()
        db.query(Course).delete()
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

    def _create_slice(self, headers: dict[str, str], title: str = "Slice A", feature_id: str = "recA") -> str:
        payload = {
            "title": title,
            "description": "Context",
            "feature_refs": [{"feature_id": feature_id}],
            "time_range": {"start": 1500, "end": 1600, "mode": "range"},
            "view_state": {
                "center": [10.0, 20.0],
                "zoom": 6,
                "enabled_layer_ids": ["layer_a"],
                "active_quick_layer_ids": ["layer_a"],
                "selected_feature_id": feature_id,
            },
            "annotations": [{"id": "ann-1", "type": "fact", "text": "note"}],
        }
        response = self.session.post(f"{self.BASE_URL}/api/research-slices", json=payload, headers=headers, timeout=5)
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def _create_story(self, headers: dict[str, str], slice_id: str, title: str = "Story") -> str:
        response = self.session.post(
            f"{self.BASE_URL}/api/stories",
            json={"title": title, "description": "", "slice_ids": [slice_id]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def _create_course(self, headers: dict[str, str], story_id: str, title: str = "Course") -> str:
        response = self.session.post(
            f"{self.BASE_URL}/api/courses",
            json={"title": title, "description": "", "story_ids": [story_id]},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(response.status_code, 201, response.text)
        return response.json()["id"]

    def test_slice_context(self):
        headers = self._register_login(f"ecc-slice-{uuid4().hex}@example.com")
        slice_id = self._create_slice(headers, feature_id="rec-slice")

        response = self.session.post(
            f"{self.BASE_URL}/api/explain-context",
            json={"scope": "slice", "slice_id": slice_id},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["scope"], "slice")
        self.assertEqual(body["slice_id"], slice_id)
        self.assertEqual(body["feature_ids"], ["rec-slice"])
        self.assertEqual(body["time_range"]["start"], 1500)

    def test_story_context(self):
        headers = self._register_login(f"ecc-story-{uuid4().hex}@example.com")
        slice_id = self._create_slice(headers, feature_id="rec-story")
        story_id = self._create_story(headers, slice_id)

        response = self.session.post(
            f"{self.BASE_URL}/api/explain-context",
            json={"scope": "story", "story_id": story_id},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["scope"], "story")
        self.assertEqual(body["story_id"], story_id)
        self.assertEqual(body["slice_id"], slice_id)
        self.assertEqual(body["feature_ids"], ["rec-story"])

    def test_course_context(self):
        headers = self._register_login(f"ecc-course-{uuid4().hex}@example.com")
        slice_id = self._create_slice(headers, feature_id="rec-course")
        story_id = self._create_story(headers, slice_id)
        course_id = self._create_course(headers, story_id)

        response = self.session.post(
            f"{self.BASE_URL}/api/explain-context",
            json={"scope": "course", "course_id": course_id},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(response.status_code, 200, response.text)
        body = response.json()
        self.assertEqual(body["scope"], "course")
        self.assertEqual(body["course_id"], course_id)
        self.assertEqual(body["story_id"], story_id)
        self.assertEqual(body["slice_id"], slice_id)
        self.assertEqual(body["feature_ids"], ["rec-course"])

    def test_ownership_enforcement(self):
        owner_headers = self._register_login(f"ecc-owner-{uuid4().hex}@example.com")
        outsider_headers = self._register_login(f"ecc-outsider-{uuid4().hex}@example.com")

        slice_id = self._create_slice(owner_headers)
        story_id = self._create_story(owner_headers, slice_id)
        course_id = self._create_course(owner_headers, story_id)

        for payload in (
            {"scope": "slice", "slice_id": slice_id},
            {"scope": "story", "story_id": story_id},
            {"scope": "course", "course_id": course_id},
        ):
            response = self.session.post(
                f"{self.BASE_URL}/api/explain-context",
                json=payload,
                headers=outsider_headers,
                timeout=5,
            )
            self.assertEqual(response.status_code, 404, response.text)

    def test_invalid_ids_and_validation(self):
        headers = self._register_login(f"ecc-invalid-{uuid4().hex}@example.com")

        missing = self.session.post(
            f"{self.BASE_URL}/api/explain-context",
            json={"scope": "slice", "slice_id": "missing-id"},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(missing.status_code, 404)

        invalid = self.session.post(
            f"{self.BASE_URL}/api/explain-context",
            json={"scope": "story"},
            headers=headers,
            timeout=5,
        )
        self.assertEqual(invalid.status_code, 422)


if __name__ == "__main__":
    unittest.main()
