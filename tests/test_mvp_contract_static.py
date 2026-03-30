import unittest
from pathlib import Path

from scripts.export_airtable import get_dedupe_key, get_origin_key, validate_feature


class MvpContractStaticTests(unittest.TestCase):
    def test_backend_contract_paths_present(self):
        main_source = Path('app/main.py').read_text(encoding='utf-8')
        auth_routes = Path('app/auth/routes.py').read_text(encoding='utf-8')

        for required_path in ['/api/health', '/api/me']:
            self.assertIn(required_path, main_source)

        for required_auth_path in ['/register', '/login', '/refresh', '/logout']:
            self.assertIn(required_auth_path, auth_routes)

    def test_frontend_refresh_retry_is_single_attempt(self):
        auth_js = Path('js/auth.js').read_text(encoding='utf-8')
        self.assertIn('if (response.status !== 401)', auth_js)
        self.assertIn('await refreshToken()', auth_js)
        self.assertIn('const retryRequest = buildAuthRequest(originalRequest.clone())', auth_js)
        self.assertNotIn('while (', auth_js)

    def test_etl_sanity_for_origin_and_validation(self):
        mapped = {
            'external_id': 'draft:10',
            'source_draft_id': 'draft:10',
            'airtable_record_id': 'recAAA',
            'name_ru': 'Feature',
            'validated': True,
            'source_url': 'https://example.com/source',
            'source_license': 'CC BY',
            'coordinates_confidence': 'exact',
            'layer_id': 'roman_empire',
            'longitude': 30.5,
            'latitude': 50.4,
            '_invalid_coordinates': False,
        }
        warnings, errors = [], []
        self.assertEqual(get_origin_key(mapped), 'draft:10')
        self.assertEqual(get_dedupe_key(mapped), ('Feature', 50.4, 30.5))
        self.assertTrue(validate_feature(mapped, {'roman_empire'}, warnings, errors))


if __name__ == '__main__':
    unittest.main()
