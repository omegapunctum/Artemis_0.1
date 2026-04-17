from __future__ import annotations

from datetime import datetime
from math import isfinite
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

class FeatureRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    feature_id: str = Field(min_length=1, max_length=255)

    @field_validator("feature_id")
    @classmethod
    def validate_feature_id(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("feature_id must not be empty")
        return normalized


class TimeRange(BaseModel):
    model_config = ConfigDict(extra="forbid")

    start: int
    end: int
    mode: Literal["point", "range"] = "range"

    @model_validator(mode="after")
    def validate_order(self) -> "TimeRange":
        if self.start > self.end:
            raise ValueError("time_range.start must be <= time_range.end")
        return self


class ViewState(BaseModel):
    model_config = ConfigDict(extra="forbid")

    center: list[float]
    zoom: float
    enabled_layer_ids: list[str] = Field(default_factory=list)
    active_quick_layer_ids: list[str] = Field(default_factory=list)
    selected_feature_id: str | None = None

    @field_validator("center")
    @classmethod
    def validate_center(cls, value: list[float]) -> list[float]:
        if len(value) != 2:
            raise ValueError("view_state.center must contain exactly 2 numbers")
        lon = float(value[0])
        lat = float(value[1])
        if not (isfinite(lon) and isfinite(lat)):
            raise ValueError("view_state.center must contain finite numbers")
        return [lon, lat]

    @field_validator("zoom")
    @classmethod
    def validate_zoom(cls, value: float) -> float:
        zoom = float(value)
        if not isfinite(zoom):
            raise ValueError("view_state.zoom must be a finite number")
        return zoom

    @field_validator("selected_feature_id")
    @classmethod
    def normalize_selected_feature_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        return normalized


class SliceAnnotation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str = Field(min_length=1, max_length=255)
    type: Literal["fact", "interpretation", "hypothesis"]
    text: str = Field(min_length=1, max_length=4000)
    feature_id: str | None = None

    @field_validator("id", "text")
    @classmethod
    def validate_required_trimmed(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("annotation fields must not be empty")
        return normalized

    @field_validator("feature_id")
    @classmethod
    def normalize_feature_id(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            return None
        return normalized


class ResearchSliceBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=4000)
    feature_refs: list[FeatureRef]
    time_range: TimeRange
    view_state: ViewState
    annotations: list[SliceAnnotation] = Field(default_factory=list)
    visibility: Literal["private"] = "private"

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("title must not be empty")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str) -> str:
        return value.strip()

    @field_validator("feature_refs")
    @classmethod
    def validate_feature_refs_non_empty(cls, value: list[FeatureRef]) -> list[FeatureRef]:
        if not value:
            raise ValueError("feature_refs must not be empty")
        return value

    @model_validator(mode="after")
    def validate_selected_feature_compatibility(self) -> "ResearchSliceBase":
        selected = self.view_state.selected_feature_id
        if selected is None:
            return self
        allowed = {item.feature_id for item in self.feature_refs}
        if selected not in allowed:
            raise ValueError("view_state.selected_feature_id must reference feature_refs")
        return self


class ResearchSliceCreate(ResearchSliceBase):
    pass


class ResearchSliceUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=4000)
    feature_refs: list[FeatureRef] | None = None
    time_range: TimeRange | None = None
    view_state: ViewState | None = None
    annotations: list[SliceAnnotation] | None = None
    visibility: Literal["private"] | None = None

    @field_validator("title")
    @classmethod
    def validate_title(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("title must not be empty")
        return normalized

    @field_validator("description")
    @classmethod
    def normalize_description(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return value.strip()

    @field_validator("feature_refs")
    @classmethod
    def validate_feature_refs_non_empty(cls, value: list[FeatureRef] | None) -> list[FeatureRef] | None:
        if value is None:
            return None
        if not value:
            raise ValueError("feature_refs must not be empty")
        return value


class ResearchSliceResponse(ResearchSliceBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class ResearchSliceListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    visibility: Literal["private"]
    feature_count: int
    annotation_count: int
    created_at: datetime
    updated_at: datetime
