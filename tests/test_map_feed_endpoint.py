import os
import subprocess
import time
import unittest
from uuid import uuid4

import requests

from app.auth.service import DATABASE_URL, SessionLocal
from app.drafts.service import Draft
from app.map_feed_schemas import MapFeedResponse
from tests.db_rebind_helper import build_clean_test_env

os.environ.setdefault("AUTH_SECRET_KEY", "test-secret-map-feed-endpoint")
os.environ.setdefault("COOKIE_HTTPONLY", "true")
os.environ.setdefault("COOKIE_SAMESITE", "lax")
os.environ.setdefault("APP_ENV", "development")

EXPECTED_ITEM_KEYS = {
    "id",
    "entity_type",
    "name",
    "layer_id",
    "geometry_type",
    "longitude",
    "latitude",
    "date_start",
    "date_end",
}


class MapFeedEndpointTests(unittest.TestCase):
    SERVER_PORT = 8027
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

    @classmethod
    def setUpClass(cls):
        env = build_clean_test_env(
            {
                "APP_ENV": "development",
                "AUTH_SECRET_KEY": os.environ.get("AUTH_SECRET_KEY", "test-secret-map-feed-endpoint"),
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
        self.session = requests.Session()
        seed = uuid4().hex
        self.session.headers.update({"x-forwarded-for": f"10.{int(seed[0:2], 16)}.{int(seed[2:4], 16)}.{int(seed[4:6], 16)}"})
        self.headers = self._register_login()
        me = self.session.get(f"{self.BASE_URL}/api/me", headers=self.headers, timeout=5)
        self.assertEqual(me.status_code, 200, me.text)
        self.user_id = me.json()["id"]

    def tearDown(self):
        self.session.close()

    def _register_login(self) -> dict[str, str]:
        email = f"mapfeed-{uuid4().hex}@example.com"
        password = "password123"
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

    def _insert_draft(self, title: str, coords):
        db = SessionLocal()
        try:
            draft = Draft(
                user_id=self.user_id,
                title=title,
                description="for map feed",
                geometry=None,
                image_url=None,
                payload={"coords": coords},
                status="draft",
                publish_status="pending",
            )
            db.add(draft)
            db.commit()
        finally:
            db.close()

    def _get_feed(self, bbox: str | None = None, limit: int | None = None, offset: int | None = None) -> requests.Response:
        params: dict[str, object] = {}
        if bbox is not None:
            params["bbox"] = bbox
        if limit is not None:
            params["limit"] = limit
        if offset is not None:
            params["offset"] = offset
        return self.session.get(f"{self.BASE_URL}/api/map/feed", headers=self.headers, params=params or None, timeout=5)

    def _seed_three_items(self):
        self._insert_draft("item-a", {"lat": 10, "lng": 20})
        self._insert_draft("item-b", {"latitude": 11, "longitude": 21})
        self._insert_draft("item-c", {"lat": 12, "lng": 22})

    def test_no_pagination_returns_full_filtered_set(self):
        self._seed_three_items()

        response = self._get_feed()
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        parsed = MapFeedResponse.model_validate(payload)

        self.assertEqual(len(payload["items"]), 3)
        self.assertEqual(payload["total"], 3)
        self.assertFalse(payload["bbox_applied"])
        self.assertEqual(parsed.total, len(parsed.items))

        for item in payload["items"]:
            self.assertEqual(set(item.keys()), EXPECTED_ITEM_KEYS)

    def test_limit_only_returns_slice_and_keeps_total(self):
        self._seed_three_items()
        baseline = self._get_feed().json()

        response = self._get_feed(limit=1)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertEqual(len(payload["items"]), 1)
        self.assertEqual(payload["items"][0]["id"], baseline["items"][0]["id"])
        self.assertEqual(payload["total"], baseline["total"])

    def test_offset_only_skips_first_and_keeps_total(self):
        self._seed_three_items()
        baseline = self._get_feed().json()

        response = self._get_feed(offset=1)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertEqual([item["id"] for item in payload["items"]], [item["id"] for item in baseline["items"]][1:])
        self.assertEqual(payload["total"], baseline["total"])

    def test_limit_and_offset_return_correct_slice_and_keep_total(self):
        self._seed_three_items()
        baseline = self._get_feed().json()

        response = self._get_feed(limit=1, offset=1)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertEqual([item["id"] for item in payload["items"]], [item["id"] for item in baseline["items"]][1:2])
        self.assertEqual(payload["total"], baseline["total"])

    def test_offset_out_of_range_returns_empty_items_with_full_total(self):
        self._seed_three_items()
        baseline = self._get_feed().json()

        response = self._get_feed(offset=100)
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertEqual(payload["items"], [])
        self.assertEqual(payload["total"], baseline["total"])

    def test_invalid_pagination_params_return_422(self):
        for params in ({"limit": 0}, {"limit": -1}, {"offset": -1}):
            response = self._get_feed(**params)
            self.assertEqual(response.status_code, 422, f"params={params} response={response.text}")

    def test_bbox_and_pagination_apply_in_correct_order(self):
        self._insert_draft("inside-1", {"lat": 10, "lng": 20})
        self._insert_draft("inside-2", {"lat": 11, "lng": 21})
        self._insert_draft("outside", {"lat": 40, "lng": 50})
        self._insert_draft("no-coords", None)

        filtered = self._get_feed(bbox="15,5,25,15")
        self.assertEqual(filtered.status_code, 200, filtered.text)
        filtered_payload = filtered.json()

        paged = self._get_feed(bbox="15,5,25,15", limit=1, offset=1)
        self.assertEqual(paged.status_code, 200, paged.text)
        paged_payload = paged.json()

        self.assertTrue(filtered_payload["bbox_applied"])
        self.assertEqual(filtered_payload["total"], 2)
        self.assertEqual(filtered_payload["total"], len(filtered_payload["items"]))

        self.assertEqual(paged_payload["total"], filtered_payload["total"])
        self.assertEqual([item["id"] for item in paged_payload["items"]], [item["id"] for item in filtered_payload["items"]][1:2])

    def test_stable_ordering_by_name_case_insensitive(self):
        self._insert_draft("charlie", {"lat": 10, "lng": 20})
        self._insert_draft("Alpha", {"lat": 10, "lng": 20})
        self._insert_draft("bravo", {"lat": 10, "lng": 20})

        response = self._get_feed()
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        self.assertEqual([item["name"] for item in payload["items"]], ["Alpha", "bravo", "charlie"])

    def test_empty_names_sorted_last(self):
        self._insert_draft("Zulu", {"lat": 10, "lng": 20})
        self._insert_draft("", {"lat": 10, "lng": 20})
        self._insert_draft("Alpha", {"lat": 10, "lng": 20})
        self._insert_draft("   ", {"lat": 10, "lng": 20})

        response = self._get_feed()
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()
        names = [item["name"] for item in payload["items"]]

        self.assertEqual(names[:2], ["Alpha", "Zulu"])
        self.assertEqual(names[2:], ["", "   "])

    def test_tie_breaker_uses_id_string_ascending(self):
        self._insert_draft("same", {"lat": 10, "lng": 20})
        self._insert_draft("same", {"lat": 10, "lng": 20})
        self._insert_draft("same", {"lat": 10, "lng": 20})

        response = self._get_feed()
        self.assertEqual(response.status_code, 200, response.text)
        payload = response.json()

        ids = [item["id"] for item in payload["items"] if item["name"] == "same"]
        self.assertEqual(ids, sorted(ids))

    def test_pagination_applies_after_sorting(self):
        self._insert_draft("charlie", {"lat": 10, "lng": 20})
        self._insert_draft("Alpha", {"lat": 10, "lng": 20})
        self._insert_draft("bravo", {"lat": 10, "lng": 20})

        page_1 = self._get_feed(limit=2, offset=0)
        page_2 = self._get_feed(limit=2, offset=2)

        self.assertEqual(page_1.status_code, 200, page_1.text)
        self.assertEqual(page_2.status_code, 200, page_2.text)

        names_page_1 = [item["name"] for item in page_1.json()["items"]]
        names_page_2 = [item["name"] for item in page_2.json()["items"]]

        self.assertEqual(names_page_1, ["Alpha", "bravo"])
        self.assertEqual(names_page_2, ["charlie"])

    def test_invalid_bbox_returns_422(self):
        for bbox in ("1,2,3", "a,b,c,d", "10,20,0,5"):
            response = self._get_feed(bbox=bbox)
            self.assertEqual(response.status_code, 422, f"bbox={bbox} response={response.text}")


if __name__ == "__main__":
    unittest.main()
