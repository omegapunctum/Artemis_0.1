import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session

from app.auth.service import User, get_current_user, get_db
from app.drafts.service import list_drafts
from app.map_feed_schemas import MapFeedItem, MapFeedResponse
from app.observability import internal_error_response, log_event

router = APIRouter(prefix="/map", tags=["map"])


def _to_float(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    if isinstance(value, (int, float)):
        return float(value)
    return None


def extract_coords(payload: Any) -> tuple[float | None, float | None]:
    if not isinstance(payload, dict):
        return None, None

    coords = payload.get("coords")
    if not isinstance(coords, dict):
        return None, None

    if "lat" in coords or "lng" in coords:
        lat = _to_float(coords.get("lat"))
        lng = _to_float(coords.get("lng"))
        return lng, lat

    if "latitude" in coords or "longitude" in coords:
        lat = _to_float(coords.get("latitude"))
        lng = _to_float(coords.get("longitude"))
        return lng, lat

    return None, None


def draft_to_map_feed_item(draft: Any) -> MapFeedItem:
    lon, lat = extract_coords(getattr(draft, "payload", None))
    return MapFeedItem(
        id=str(draft.id),
        entity_type="draft",
        name=draft.title,
        layer_id=None,
        geometry_type=None,
        longitude=lon,
        latitude=lat,
        date_start=None,
        date_end=None,
    )


def build_map_feed_items_from_drafts(drafts: list[Any]) -> list[MapFeedItem]:
    return [draft_to_map_feed_item(draft) for draft in drafts]




def get_places_mock() -> list[dict[str, Any]]:
    return [
        {
            "id": "p1",
            "name": "Place A",
            "coords": {"lat": 10.0, "lng": 20.0},
        },
        {
            "id": "p2",
            "name": "Place B",
            "coords": {"lat": None, "lng": None},
        },
    ]


def place_to_map_feed_item(place: dict[str, Any]) -> MapFeedItem:
    lon, lat = extract_coords({"coords": place.get("coords")})
    return MapFeedItem(
        id=str(place["id"]),
        entity_type="place",
        name=place.get("name"),
        layer_id=None,
        geometry_type=None,
        longitude=lon,
        latitude=lat,
        date_start=None,
        date_end=None,
    )

MAP_FEED_ADAPTERS: dict[str, Any] = {
    "draft": draft_to_map_feed_item,
    "place": place_to_map_feed_item,
}


def map_entities(entity_type: str, entities: list[Any]) -> list[MapFeedItem]:
    adapter = MAP_FEED_ADAPTERS.get(entity_type)
    if not adapter:
        raise ValueError(f"Unsupported entity_type: {entity_type}")
    return [adapter(entity) for entity in entities]

def build_item_sort_key(item: MapFeedItem) -> tuple[int, str, str]:
    has_name = bool(item.name and item.name.strip())
    normalized_name = item.name.strip().casefold() if has_name else ""
    return (0 if has_name else 1, normalized_name, item.id)


def parse_bbox(bbox: str | None) -> tuple[float, float, float, float] | None:
    if bbox is None:
        return None

    parts = [part.strip() for part in bbox.split(",")]
    if len(parts) != 4:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid bbox format")

    try:
        min_lng, min_lat, max_lng, max_lat = (float(part) for part in parts)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid bbox format") from exc

    if min_lng > max_lng or min_lat > max_lat:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid bbox bounds")

    return min_lng, min_lat, max_lng, max_lat


@router.get("/feed", response_model=MapFeedResponse)
def get_map_feed(
    request: Request,
    bbox: str | None = Query(default=None),
    entity_type: str | None = Query(default=None),
    limit: int | None = Query(default=None, gt=0),
    offset: int = Query(default=0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Runtime map feed (NON-CANONICAL).

    This endpoint provides a runtime-optimized read model for UI usage.
    It is NOT the source of truth for map data.

    Canonical data is defined by exported datasets (e.g. GeoJSON via ETL pipeline).
    Do not rely on this endpoint as a stable public API contract.
    """
    request.state.user_id = current_user.id
    try:
        parsed_bbox = parse_bbox(bbox)
        filtered_items: list[MapFeedItem] = []

        draft_items = map_entities("draft", list_drafts(db, current_user))
        place_items = map_entities("place", get_places_mock())
        items = draft_items + place_items

        if entity_type is not None:
            if entity_type not in MAP_FEED_ADAPTERS:
                raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid entity_type")
            items = [item for item in items if item.entity_type == entity_type]

        for item in items:
            if parsed_bbox is not None:
                if item.longitude is None or item.latitude is None:
                    continue
                min_lng, min_lat, max_lng, max_lat = parsed_bbox
                if not (min_lng <= item.longitude <= max_lng and min_lat <= item.latitude <= max_lat):
                    continue

            filtered_items.append(item)

        filtered_items.sort(key=build_item_sort_key)

        total = len(filtered_items)
        if limit is None:
            items = filtered_items[offset:]
        else:
            items = filtered_items[offset : offset + limit]

        return MapFeedResponse(items=items, total=total, bbox_applied=parsed_bbox is not None)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(
            logging.ERROR,
            "map.feed.error",
            path=request.url.path,
            request_id=request.state.request_id,
            user_id=current_user.id,
            error=str(exc),
        )
        return internal_error_response(request)
