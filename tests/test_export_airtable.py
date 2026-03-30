import unittest

from scripts.export_airtable import (
    get_dedupe_key,
    get_origin_key,
    map_layers,
    map_record,
    normalize_coordinates_confidence,
    validate_feature,
)


class ExportAirtableIdempotencyTests(unittest.TestCase):
    def test_coordinates_confidence_legacy_normalization(self):
        self.assertEqual(normalize_coordinates_confidence("EXACT"), "exact")
        self.assertEqual(normalize_coordinates_confidence("APPROXIMATE±5km"), "approximate")
        self.assertEqual(normalize_coordinates_confidence("CONDITIONAL"), "conditional")

    def test_origin_key_priority(self):
        mapped = {
            "external_id": "draft:100",
            "airtable_record_id": "recAAA",
            "source_draft_id": "draft:100",
        }
        self.assertEqual(get_origin_key(mapped), "draft:100")

    def test_origin_key_fallback_to_airtable_record_id(self):
        mapped = {"external_id": None, "airtable_record_id": "recBBB", "source_draft_id": None}
        self.assertEqual(get_origin_key(mapped), "recBBB")

    def test_dedupe_key_fallback_without_origin(self):
        mapped = {"name_ru": "Test", "latitude": 1.0, "longitude": 2.0}
        self.assertEqual(get_dedupe_key(mapped), ("Test", 1.0, 2.0))

    def test_map_layer_linked_record_to_public_layer_id(self):
        linked_map, _ = map_layers(
            [
                {
                    "id": "recLayer1",
                    "fields": {
                        "layer_id": "roman_empire",
                        "name_ru": "Римская империя",
                        "color_hex": "#112233",
                        "is_enabled": True,
                    },
                }
            ]
        )
        mapped = map_record(
            {"id": "recFeature1", "fields": {"layer_id": ["recLayer1"]}},
            [],
            linked_map,
        )
        self.assertEqual(mapped["layer_id"], "roman_empire")

    def test_coordinates_source_is_non_fatal(self):
        mapped = {
            "id": "recFeature2",
            "validated": True,
            "source_url": "https://example.com/source",
            "longitude": 10.0,
            "latitude": 10.0,
            "_invalid_coordinates": False,
            "source_license": "CC BY",
            "coordinates_source": "UNESCO / Wikipedia",
            "layer_id": "roman_empire",
            "coordinates_confidence": "exact",
        }
        warnings = []
        errors = []
        is_valid = validate_feature(mapped, {"roman_empire"}, warnings, errors)
        self.assertTrue(is_valid)
        self.assertFalse([e for e in errors if e.get("severity") == "critical"])


if __name__ == "__main__":
    unittest.main()
