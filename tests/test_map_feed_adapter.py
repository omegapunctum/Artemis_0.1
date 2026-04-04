from types import SimpleNamespace

from app.routes.map import MAP_FEED_ADAPTERS, build_map_feed_items_from_drafts, draft_to_map_feed_item, map_entities, place_to_map_feed_item


def test_draft_to_map_feed_item_maps_expected_fields() -> None:
    draft = SimpleNamespace(id=42, title="Draft title", payload={"coords": {"lat": 55.75, "lng": 37.61}})

    item = draft_to_map_feed_item(draft)

    assert item.id == "42"
    assert item.entity_type == "draft"
    assert item.name == "Draft title"
    assert item.longitude == 37.61
    assert item.latitude == 55.75
    assert item.layer_id is None
    assert item.geometry_type is None
    assert item.date_start is None
    assert item.date_end is None


def test_build_map_feed_items_from_drafts_uses_adapter_for_all_drafts() -> None:
    drafts = [
        SimpleNamespace(id=1, title="A", payload={"coords": {"latitude": 10, "longitude": 20}}),
        SimpleNamespace(id=2, title="B", payload={"coords": None}),
    ]

    items = build_map_feed_items_from_drafts(drafts)

    assert [item.id for item in items] == ["1", "2"]
    assert [item.entity_type for item in items] == ["draft", "draft"]
    assert items[0].longitude == 20.0
    assert items[0].latitude == 10.0
    assert items[1].longitude is None
    assert items[1].latitude is None


def test_map_entities_unknown_type_raises() -> None:
    entities = [SimpleNamespace(id=1, title="X", payload={"coords": {"lat": 1, "lng": 2}})]

    try:
        map_entities("unknown", entities)
        assert False, "Expected ValueError for unknown entity_type"
    except ValueError as exc:
        assert str(exc) == "Unsupported entity_type: unknown"


def test_map_entities_uses_draft_registry_adapter() -> None:
    draft = SimpleNamespace(id=7, title="Registry Draft", payload={"coords": {"lat": 50, "lng": 30}})

    items = map_entities("draft", [draft])

    assert "draft" in MAP_FEED_ADAPTERS
    assert len(items) == 1
    assert items[0].id == "7"
    assert items[0].entity_type == "draft"
    assert items[0].name == "Registry Draft"
    assert items[0].longitude == 30.0
    assert items[0].latitude == 50.0


def test_place_to_map_feed_item_maps_expected_fields() -> None:
    place = {"id": "p1", "name": "Place A", "coords": {"lat": 10.0, "lng": 20.0}}

    item = place_to_map_feed_item(place)

    assert item.id == "p1"
    assert item.entity_type == "place"
    assert item.name == "Place A"
    assert item.longitude == 20.0
    assert item.latitude == 10.0
