from pydantic import BaseModel, ConfigDict, StrictInt


class MapFeedItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    entity_type: str
    name: str | None = None
    layer_id: str | None = None
    geometry_type: str | None = None
    longitude: float | None = None
    latitude: float | None = None
    date_start: str | None = None
    date_end: str | None = None


class MapFeedResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    items: list[MapFeedItem]
    total: StrictInt
    bbox_applied: bool
