import unittest

from scripts.export_airtable import get_dedupe_key, get_origin_key


class ExportAirtableIdempotencyTests(unittest.TestCase):
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
        self.assertEqual(get_dedupe_key(mapped), ("fallback", "Test", 1.0, 2.0))


if __name__ == "__main__":
    unittest.main()
