import os
import subprocess
import time
import unittest
from pathlib import Path
from uuid import uuid4

import requests

from app.auth.service import DATABASE_URL
from tests.db_rebind_helper import build_clean_test_env


class UploadsContractTests(unittest.TestCase):
    SERVER_PORT = 8012
    BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"
    VALID_PNG = b"\x89PNG\r\n\x1a\ncontract-content"
    VALID_JPEG = b"\xff\xd8\xff\xe0jpeg-content"
    VALID_WEBP = b"RIFF\x0c\x00\x00\x00WEBPwebp-content"

    @classmethod
    def setUpClass(cls):
        env = build_clean_test_env(
            {
                "APP_ENV": "development",
                "AUTH_SECRET_KEY": os.environ.get("AUTH_SECRET_KEY", "test-secret-uploads-contract"),
                "AUTH_DATABASE_URL": DATABASE_URL,
                "AUTH_SESSION_BACKEND": "memory",
            }
        )
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
                health = requests.get(f"{cls.BASE_URL}/api/health", timeout=0.5)
                if health.status_code == 200:
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
        ip_seed = uuid4().hex
        self.session.headers.update(
            {"x-forwarded-for": f"10.{int(ip_seed[0:2], 16)}.{int(ip_seed[2:4], 16)}.{int(ip_seed[4:6], 16)}"}
        )

    def tearDown(self):
        self.session.close()

    def _auth_headers(self) -> dict[str, str]:
        email = f"uploads-contract-{uuid4().hex}@example.com"
        password = "password123"
        register = self.session.post(f"{self.BASE_URL}/api/auth/register", json={"email": email, "password": password}, timeout=5)
        self.assertEqual(register.status_code, 201)
        login = self.session.post(f"{self.BASE_URL}/api/auth/login", json={"email": email, "password": password}, timeout=5)
        self.assertEqual(login.status_code, 200)
        token = login.json()["access_token"]
        return {"Authorization": f"Bearer {token}"}

    def _upload(
        self,
        headers: dict[str, str],
        *,
        license_value: str = "CC BY",
        filename: str = "contract.png",
        content: bytes | None = None,
        content_type: str = "image/png",
    ) -> requests.Response:
        payload = content if content is not None else self.VALID_PNG
        return self.session.post(
            f"{self.BASE_URL}/api/uploads",
            headers=headers,
            data={"license": license_value},
            files={"file": (filename, payload, content_type)},
            timeout=5,
        )

    @staticmethod
    def _error_detail(response: requests.Response) -> str | None:
        payload = response.json()
        if not isinstance(payload, dict):
            return str(payload)
        detail = payload.get("detail")
        if isinstance(detail, str) and detail:
            return detail
        error = payload.get("error")
        if isinstance(error, str):
            return error
        if isinstance(error, dict):
            message = error.get("message")
            if isinstance(message, str):
                return message
        return None

    def test_upload_contract_success_shape_and_accessibility(self):
        headers = self._auth_headers()
        response = self._upload(headers, license_value="CC BY")

        self.assertEqual(response.status_code, 201)
        payload = response.json()
        self.assertEqual(set(payload.keys()), {"id", "url", "filename", "license"})
        self.assertEqual(payload["license"], "CC BY")
        self.assertTrue(payload["filename"])
        self.assertTrue(payload["url"])
        self.assertTrue(payload["url"].startswith("/uploads/"))

        served = self.session.get(f"{self.BASE_URL}{payload['url']}", timeout=5)
        self.assertEqual(served.status_code, 200)
        self.assertEqual(served.content, self.VALID_PNG)
        self.assertEqual(served.headers.get("x-content-type-options"), "nosniff")
        self.assertEqual(served.headers.get("content-disposition"), "inline")
        self.assertEqual(served.headers.get("cache-control"), "no-store")

        uploaded_path = Path("uploads") / payload["url"].removeprefix("/uploads/")
        uploaded_path.unlink(missing_ok=True)

    def test_upload_contract_missing_license_returns_400(self):
        headers = self._auth_headers()
        response = self.session.post(
            f"{self.BASE_URL}/api/uploads",
            headers=headers,
            files={"file": ("contract.png", self.VALID_PNG, "image/png")},
            timeout=5,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self._error_detail(response), "License is required")

    def test_upload_contract_blank_license_returns_400(self):
        headers = self._auth_headers()
        response = self._upload(headers, license_value="   ")

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self._error_detail(response), "License is required")

    def test_upload_contract_missing_file_returns_400(self):
        headers = self._auth_headers()
        response = self.session.post(
            f"{self.BASE_URL}/api/uploads",
            headers=headers,
            data={"license": "CC BY"},
            timeout=5,
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self._error_detail(response), "File is required")

    def test_upload_contract_rejects_spoofed_png_signature(self):
        headers = self._auth_headers()
        response = self._upload(
            headers,
            filename="spoofed.png",
            content=b"not-a-real-png",
            content_type="image/png",
        )

        self.assertEqual(response.status_code, 400)
        self.assertEqual(self._error_detail(response), "Unsupported image type")

    def test_upload_contract_rejects_spoofed_jpeg_and_webp_signatures(self):
        headers = self._auth_headers()

        for filename, content_type in (("spoofed.jpg", "image/jpeg"), ("spoofed.webp", "image/webp")):
            response = self._upload(
                headers,
                filename=filename,
                content=b"plain-text",
                content_type=content_type,
            )
            self.assertEqual(response.status_code, 400)
            self.assertEqual(self._error_detail(response), "Unsupported image type")

    def test_upload_contract_accepts_valid_jpeg_and_webp_signatures(self):
        headers = self._auth_headers()
        uploads = [
            ("valid.jpg", self.VALID_JPEG, "image/jpeg"),
            ("valid.webp", self.VALID_WEBP, "image/webp"),
        ]

        for filename, content, content_type in uploads:
            response = self._upload(
                headers,
                filename=filename,
                content=content,
                content_type=content_type,
            )
            self.assertEqual(response.status_code, 201)
            payload = response.json()
            uploaded_path = Path("uploads") / payload["url"].removeprefix("/uploads/")
            uploaded_path.unlink(missing_ok=True)
