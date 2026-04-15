import os
import unittest

from fastapi import HTTPException

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
from app.auth.session_store import InMemoryRefreshSessionStore  # noqa: E402
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

    def test_refresh_fails_after_registry_clear(self):
        register_user(self.db, 'restart-like@example.com', 'password123')
        _, refresh_token = login_user(self.db, 'restart-like@example.com', 'password123')

        _, rotated_refresh_token = rotate_refresh_token(refresh_token, self.db)
        active_refresh_tokens.clear()

        with self.assertRaises(HTTPException) as exc:
            rotate_refresh_token(rotated_refresh_token, self.db)
        self.assertEqual(exc.exception.status_code, 401)
        self.assertEqual(exc.exception.detail, 'Invalid refresh token')

    def test_two_inmemory_stores_do_not_share_sessions(self):
        store_a = InMemoryRefreshSessionStore()
        store_b = InMemoryRefreshSessionStore()

        store_a.store_refresh_session('jti-a', 'user-a')

        self.assertEqual(store_a.get_refresh_session_user('jti-a'), 'user-a')
        self.assertIsNone(store_b.get_refresh_session_user('jti-a'))


if __name__ == '__main__':
    unittest.main()
