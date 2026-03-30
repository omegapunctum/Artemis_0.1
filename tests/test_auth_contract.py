import os
import unittest
from pathlib import Path

DB_PATH = Path('artemis_auth.db')
if DB_PATH.exists():
    DB_PATH.unlink()

os.environ.setdefault('AUTH_SECRET_KEY', 'test-secret-for-tests-only')
os.environ.setdefault('COOKIE_SECURE', 'false')

from app.auth.service import (  # noqa: E402
    SessionLocal,
    User,
    active_refresh_tokens,
    get_refresh_token,
    init_db,
    login_user,
    logout_user,
    register_user,
    rotate_refresh_token,
)
from app.observability import health_payload  # noqa: E402


class AuthContractTests(unittest.TestCase):
    def setUp(self):
        init_db()
        self.db = SessionLocal()

    def tearDown(self):
        self.db.query(User).delete()
        self.db.commit()
        self.db.close()
        active_refresh_tokens.clear()

    def test_register_login_refresh_logout_health(self):
        access_token = register_user(self.db, 'auth-user@example.com', 'password123')
        self.assertTrue(access_token)

        access_token_login, refresh_token = login_user(self.db, 'auth-user@example.com', 'password123')
        self.assertTrue(access_token_login)
        self.assertTrue(refresh_token)

        refreshed_access_token, new_refresh_token = rotate_refresh_token(refresh_token, self.db)
        self.assertTrue(refreshed_access_token)
        self.assertTrue(new_refresh_token)

        logout_user(new_refresh_token)
        with self.assertRaises(Exception):
            rotate_refresh_token(new_refresh_token, self.db)

        health = health_payload()
        self.assertIn('counts', health)


if __name__ == '__main__':
    unittest.main()
