import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

from app.auth.service import SessionLocal
from app.drafts.service import Draft

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-map-feed-multi-entity")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")


class MapFeedMultiEntityTests(unittest.TestCase):
    SERVER_PORT = 8028
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
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
        self.session = requests.Session()
        seed = uuid4().hex
        self.session.headers.update({"x-forwarded-for": f"10.{int(seed[0:2], 16)}.{int(seed[2:4], 16)}.{int(seed[4:6], 16)}"})

        email = f"multi-entity-{uuid4().hex}@example.com"
        password = "password123"
        register = self.session.post(
            f"{self.BASE_URL}/api/auth/register", json={"email": email, "password": password}, timeout=5
        )
        self.assertEqual(register.status_code, 201, register.text)
        login = self.session.post(
            f"{self.BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=5
        )
        self.assertEqual(login.status_code, 200, login.text)
        self.headers = {"Authorization": f"Bearer {login.json()['access_token']}"}

        me = self.session.get(f"{self.BASE_URL}/api/me", headers=self.headers, timeout=5)
        self.assertEqual(me.status_code, 200, me.text)
        self.user_id = me.json()["id"]

    def tearDown(self):
        self.session.close()

    def _insert_draft(self, title: str, lat: float = 10.0, lng: float = 20.0):
        db = SessionLocal()
        try:
            draft = Draft(
                user_id=self.user_id,
                title=title,
                description="multi entity",
                geometry=None,
                image_url=None,
                payload={"coords": {"lat": lat, "lng": lng}},
                status="draft",
                publish_status="pending",
            )
            db.add(draft)
            db.commit()
        finally:
            db.close()

    def _get_feed(self, **params) -> requests.Response:
        return self.session.get(f"{self.BASE_URL}/api/map/feed", headers=self.headers, params=params or None, timeout=5)

    def test_multi_entity_present_without_entity_type(self):
        self._insert_draft("Draft Source")
        response = self._get_feed()
        self.assertEqual(response.status_code, 200, response.text)

        entity_types = {item["entity_type"] for item in response.json()["items"]}
        self.assertIn("draft", entity_types)
        self.assertIn("place", entity_types)

    def test_entity_type_draft_returns_only_drafts(self):
        self._insert_draft("Draft Source")

        response = self._get_feed(entity_type="draft")
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertTrue(payload["items"])
        self.assertTrue(all(item["entity_type"] == "draft" for item in payload["items"]))
        self.assertEqual(payload["total"], len(payload["items"]))

    def test_entity_type_place_returns_only_places(self):
        response = self._get_feed(entity_type="place")
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertTrue(payload["items"])
        self.assertTrue(all(item["entity_type"] == "place" for item in payload["items"]))
        self.assertEqual(payload["total"], len(payload["items"]))

    def test_invalid_entity_type_returns_422(self):
        response = self._get_feed(entity_type="unknown")
        self.assertEqual(response.status_code, 422, response.text)

    def test_entity_type_and_bbox_filter_order(self):
        self._insert_draft("Draft In", lat=10.0, lng=20.0)
        self._insert_draft("Draft Out", lat=40.0, lng=50.0)

        response = self._get_feed(entity_type="place", bbox="15,5,25,15")
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertEqual(payload["total"], 1)
        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["id"], "p1")
        self.assertEqual(payload["items"][0]["entity_type"], "place")

    def test_entity_type_and_pagination(self):
        self._insert_draft("Zeta")
        self._insert_draft("Alpha")

        filtered = self._get_feed(entity_type="draft")
        paged = self._get_feed(entity_type="draft", limit=1, offset=1)

        self.assertEqual(filtered.status_code, 200, filtered.text)
        self.assertEqual(paged.status_code, 200, paged.text)

        filtered_payload = filtered.json()
        paged_payload = paged.json()

        self.assertTrue(all(item["entity_type"] == "draft" for item in filtered_payload["items"]))
        self.assertEqual(paged_payload["total"], filtered_payload["total"])
        self.assertEqual([item["id"] for item in paged_payload["items"]], [item["id"] for item in filtered_payload["items"]][1:2])


if __name__ == "__main__":
    unittest.main()
