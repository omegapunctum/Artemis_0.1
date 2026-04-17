import os
import subprocess
import time
import unittest

import requests
from starlette.requests import Request

from app.observability import internal_error_response
from tests.db_rebind_helper import build_clean_test_env


class RequestIdPropagationTests(unittest.TestCase):
    SERVER_PORT = 8012
    BASE_URL = f'http://127.0.0.1:{SERVER_PORT}'

    @classmethod
    def setUpClass(cls):
        env = build_clean_test_env({})
        cls.server = subprocess.Popen(
            [
                'uvicorn',
                'app.main:app',
                '--host',
                '127.0.0.1',
                '--port',
                str(cls.SERVER_PORT),
                '--log-level',
                'warning',
            ],
            env=env,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(50):
            try:
                response = requests.get(f'{cls.BASE_URL}/api/health', timeout=0.5)
                if response.status_code == 200:
                    break
            except requests.RequestException:
                pass
            time.sleep(0.2)
        else:
            raise RuntimeError('Failed to start test server')

    @classmethod
    def tearDownClass(cls):
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def test_success_response_returns_x_request_id_header(self):
        response = requests.get(f'{self.BASE_URL}/api/health', headers={'X-Request-ID': 'req-success-123'}, timeout=5)

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get('X-Request-ID'), 'req-success-123')

    def test_validation_error_response_contains_request_id_header_and_body(self):
        response = requests.post(f'{self.BASE_URL}/api/auth/register', json={}, timeout=5)

        self.assertEqual(response.status_code, 422)
        self.assertTrue(response.headers.get('X-Request-ID'))
        payload = response.json()
        self.assertIsInstance(payload.get('detail'), list)
        self.assertEqual(payload.get('request_id'), response.headers.get('X-Request-ID'))

    def test_internal_error_response_contains_request_id_in_json(self):
        scope = {'type': 'http', 'headers': [], 'method': 'GET', 'path': '/api/health'}

        async def receive():
            return {'type': 'http.request', 'body': b'', 'more_body': False}

        request = Request(scope, receive)
        request.state.request_id = 'req-internal-456'

        response = internal_error_response(request)
        self.assertEqual(response.status_code, 500)
        self.assertEqual(response.headers.get('X-Request-ID'), 'req-internal-456')
        self.assertEqual(response.body, b'{\"error\":\"internal_error\",\"request_id\":\"req-internal-456\"}')


if __name__ == '__main__':
    unittest.main()
