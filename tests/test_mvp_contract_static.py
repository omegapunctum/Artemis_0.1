import unittest
import json
import logging
from pathlib import Path

from scripts.export_airtable import build_geojson_features, get_canonical_publish_id, get_dedupe_key, get_origin_key, validate_feature


class MvpContractStaticTests(unittest.TestCase):
    def test_backend_contract_paths_present(self):
        main_source = Path('app/main.py').read_text(encoding='utf-8')
        auth_routes = Path('app/auth/routes.py').read_text(encoding='utf-8')
        drafts_routes = Path('app/drafts/routes.py').read_text(encoding='utf-8')
        drafts_schemas = Path('app/drafts/schemas.py').read_text(encoding='utf-8')

        for required_path in ['/api/health', '/api/me']:
            self.assertIn(required_path, main_source)

        for required_auth_path in ['/register', '/login', '/refresh', '/logout']:
            self.assertIn(required_auth_path, auth_routes)

        self.assertIn('def serialize_draft_for_ui', drafts_routes)
        for flat_field in ['"name_ru"', '"layer_id"', '"date_start"', '"coords"']:
            self.assertIn(flat_field, drafts_routes)
        self.assertIn('status: Literal["draft", "pending", "approved", "rejected"]', drafts_schemas)

    def test_frontend_refresh_retry_is_single_attempt(self):
        auth_js = Path('js/auth.js').read_text(encoding='utf-8')
        self.assertIn('if (response.status !== 401)', auth_js)
        self.assertIn('await refreshToken()', auth_js)
        self.assertIn('const retryRequest = buildAuthRequest(originalRequest.clone())', auth_js)
        self.assertNotIn('while (', auth_js)

    def test_etl_sanity_for_origin_and_validation(self):
        mapped = {
            'id': 'recAAA',
            'external_id': 'draft:10',
            'source_draft_id': 'draft:10',
            'airtable_record_id': 'recAAA',
            'name_ru': 'Feature',
            'validated': True,
            'source_url': 'https://example.com/source',
            'source_license': 'CC BY',
            'coordinates_confidence': 'conditional',
            'coordinates_source': 'Wikipedia',
            'layer_id': 'roman_empire',
            'layer_type': 'biography',
            'date_start': '1900',
            '_raw_date_start_present': True,
            'longitude': 30.5,
            'latitude': 50.4,
            '_invalid_coordinates': False,
        }
        warnings, errors = [], []
        self.assertEqual(get_origin_key(mapped), 'draft:10')
        self.assertEqual(get_canonical_publish_id(mapped), 'recAAA')
        self.assertEqual(get_dedupe_key(mapped), ('Feature', 50.4, 30.5))
        self.assertTrue(validate_feature(mapped, {'roman_empire'}, warnings, errors))

    def test_release_guard_features_geojson_exists_and_is_valid(self):
        path = Path("data/features.geojson")
        self.assertTrue(path.exists(), "data/features.geojson must exist")
        content = path.read_text(encoding="utf-8").strip()
        if not content:
            logging.warning("data/features.geojson is empty (allowed)")
            return
        payload = json.loads(content)
        self.assertEqual(payload.get("type"), "FeatureCollection")
        self.assertIsInstance(payload.get("features"), list)

    def test_validated_layer_not_empty_when_valid_input_exists(self):
        mapped_valid = {
            'id': 'recValid',
            'airtable_record_id': 'recValid',
            'external_id': 'draft:42',
            'source_draft_id': 'draft:42',
            'normalized_id': 'norm42',
            'name_ru': 'Feature',
            'validated': True,
            'source_url': 'https://example.com/source',
            'source_license': 'CC BY',
            'coordinates_confidence': 'exact',
            'coordinates_source': 'Wikipedia',
            'layer_id': 'roman_empire',
            'layer_type': 'biography',
            'date_start': '1900',
            '_raw_date_start_present': True,
            'longitude': 30.5,
            'latitude': 50.4,
            '_invalid_coordinates': False,
        }
        warnings, errors = [], []
        self.assertTrue(validate_feature(mapped_valid, {'roman_empire'}, warnings, errors))
        geojson = build_geojson_features([mapped_valid], warnings, errors)
        self.assertEqual(geojson.get("type"), "FeatureCollection")
        self.assertGreater(len(geojson.get("features", [])), 0)

    def test_service_worker_does_not_cache_api_routes(self):
        source = Path("sw.js").read_text(encoding="utf-8")
        self.assertIn("isPrivateRequest(url)", source)
        self.assertIn("normalizedPath.startsWith('api/')", source)
        self.assertIn("api/auth", source)
        self.assertIn("api/me", source)
        self.assertIn("event.respondWith(fetch(request));", source)

    def test_frontend_map_large_dataset_path_keeps_clustering_and_source_updates(self):
        map_source = Path("js/map.js").read_text(encoding="utf-8")
        self.assertIn("const shouldCluster = featureCollection.features.length > 500;", map_source)
        self.assertIn("source.setData(mapData);", map_source)
        self.assertNotIn("new maplibregl.Map(", map_source.split("export function updateMapData", 1)[-1])
        self.assertIn("const HEATMAP_LAYER_ID = 'artemis-heatmap';", map_source)
        self.assertIn("type: 'heatmap'", map_source)
        self.assertIn("export function setMapDisplayMode(map, mode = 'points')", map_source)

    def test_frontend_ui_has_display_mode_toggle_and_time_aggregation_hook(self):
        ui_source = Path("js/ui.js").read_text(encoding="utf-8")
        state_source = Path("js/state.js").read_text(encoding="utf-8")
        self.assertIn("setupDisplayModeToggle(elements, state, map);", ui_source)
        self.assertIn("setMapDisplayMode(map, state.displayMode);", ui_source)
        self.assertIn("aggregateFeaturesByDecade(nextFilteredFeatures)", ui_source)
        self.assertIn("export function aggregateFeaturesByDecade(features = [])", state_source)

    def test_courses_live_behavioral_tests_exist(self):
        behavior_test = Path("tests/test_courses_live_behavior.py")
        self.assertTrue(behavior_test.exists(), "Behavioral coverage for Courses/LIVE must exist")
        source = behavior_test.read_text(encoding="utf-8")

        self.assertIn("test_load_courses_returns_courses_and_uses_cache", source)
        self.assertIn("test_courses_state_select_and_step_boundaries", source)
        self.assertIn("test_live_recent_features_order_and_limit", source)

    def test_ugc_uses_only_canonical_api_drafts_paths(self):
        ugc_source = Path("js/ui.ugc.js").read_text(encoding="utf-8")
        self.assertIn("'/api/drafts/my'", ugc_source)
        self.assertIn("'/api/drafts'", ugc_source)
        self.assertIn("`/api/drafts/${id}`", ugc_source)
        self.assertIn("`/api/drafts/${id}/submit`", ugc_source)
        self.assertNotIn("'/drafts'", ugc_source)
        self.assertNotIn("`/drafts/${id}`", ugc_source)
        self.assertNotIn("`/drafts/${id}/submit`", ugc_source)


if __name__ == '__main__':
    unittest.main()
