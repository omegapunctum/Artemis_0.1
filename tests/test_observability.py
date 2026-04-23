import unittest
from unittest.mock import patch
from types import SimpleNamespace

from app.observability import (
    DEFAULT_HEALTH_ERROR_DECAY_SECONDS,
    get_request_id,
    health_payload,
    metrics,
    _read_health_error_decay_seconds,
)


class ObservabilityTests(unittest.TestCase):
    def test_get_request_id_uses_header_when_present(self):
        request = SimpleNamespace(headers={'x-request-id': 'req-123'})
        self.assertEqual(get_request_id(request), 'req-123')

    def test_get_request_id_generates_uuid_when_missing(self):
        request = SimpleNamespace(headers={})
        self.assertTrue(get_request_id(request))

    def test_health_payload_exposes_counts_and_uptime(self):
        before = metrics.snapshot()['counts']['total_requests']
        metrics.increment('total_requests')
        payload = health_payload()
        self.assertIn('ok', payload)
        self.assertIn('uptime', payload)
        self.assertIn('counts', payload)
        self.assertIn('recent_error_window_seconds', payload)
        self.assertIn('status_reason', payload)
        self.assertEqual(payload['recent_error_window_seconds'], 120)
        self.assertIn(
            payload['status_reason'],
            {'healthy_no_recent_server_errors', 'recent_server_error_within_decay_window'},
        )
        self.assertGreaterEqual(payload['counts']['total_requests'], before + 1)

    def test_health_decay_window_default_is_120_when_env_missing(self):
        with patch.dict('os.environ', {}, clear=True):
            self.assertEqual(_read_health_error_decay_seconds(), DEFAULT_HEALTH_ERROR_DECAY_SECONDS)

    def test_health_decay_window_uses_env_override(self):
        with patch.dict('os.environ', {'HEALTH_ERROR_DECAY_SECONDS': '45'}, clear=True):
            self.assertEqual(_read_health_error_decay_seconds(), 45)

    def test_health_decay_window_invalid_env_falls_back_to_default(self):
        with patch.dict('os.environ', {'HEALTH_ERROR_DECAY_SECONDS': 'not-a-number'}, clear=True):
            self.assertEqual(_read_health_error_decay_seconds(), DEFAULT_HEALTH_ERROR_DECAY_SECONDS)


if __name__ == '__main__':
    unittest.main()
