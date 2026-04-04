import pytest
from pydantic import ValidationError

from app.map_feed_schemas import MapFeedResponse


def test_map_feed_response_accepts_valid_payload() -> None:
    payload = {
        "items": [
            {
                "id": "obj-1",
                "entity_type": "feature",
                "name": "Sample",
                "layer_id": "architecture",
                "geometry_type": "Point",
                "longitude": 37.61,
                "latitude": 55.75,
                "date_start": "1900",
                "date_end": "1950",
            }
        ],
        "total": 1,
        "bbox_applied": False,
    }

    result = MapFeedResponse.model_validate(payload)

    assert result.total == 1
    assert len(result.items) == 1
    assert result.items[0].id == "obj-1"


def test_map_feed_response_accepts_nullable_item_fields() -> None:
    payload = {
        "items": [
            {
                "id": "obj-2",
                "entity_type": "feature",
                "name": None,
                "layer_id": None,
                "geometry_type": None,
                "longitude": None,
                "latitude": None,
                "date_start": None,
                "date_end": None,
            }
        ],
        "total": 1,
        "bbox_applied": True,
    }

    result = MapFeedResponse.model_validate(payload)

    assert result.items[0].name is None
    assert result.items[0].longitude is None


def test_map_feed_response_requires_item_id() -> None:
    payload = {
        "items": [
            {
                "entity_type": "feature",
                "name": "Missing id",
                "layer_id": "architecture",
                "geometry_type": "Point",
                "longitude": 37.61,
                "latitude": 55.75,
                "date_start": "1900",
                "date_end": "1950",
            }
        ],
        "total": 1,
        "bbox_applied": False,
    }

    with pytest.raises(ValidationError):
        MapFeedResponse.model_validate(payload)


def test_map_feed_response_rejects_non_integer_total() -> None:
    payload = {
        "items": [],
        "total": "1",
        "bbox_applied": False,
    }

    with pytest.raises(ValidationError):
        MapFeedResponse.model_validate(payload)


def test_map_feed_response_requires_items_list() -> None:
    payload = {
        "items": {"id": "obj-3", "entity_type": "feature"},
        "total": 1,
        "bbox_applied": False,
    }

    with pytest.raises(ValidationError):
        MapFeedResponse.model_validate(payload)
