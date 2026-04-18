from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class StoryBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=4000)
    slice_ids: list[str]
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

    @field_validator("slice_ids")
    @classmethod
    def validate_slice_ids(cls, value: list[str]) -> list[str]:
        normalized = [str(item or "").strip() for item in value]
        normalized = [item for item in normalized if item]
        if not normalized:
            raise ValueError("slice_ids must not be empty")
        if len(set(normalized)) != len(normalized):
            raise ValueError("slice_ids must not contain duplicates")
        return normalized


class StoryCreate(StoryBase):
    pass


class StoryUpdate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str | None = Field(default=None, min_length=1, max_length=180)
    description: str | None = Field(default=None, max_length=4000)
    slice_ids: list[str] | None = None
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

    @field_validator("slice_ids")
    @classmethod
    def validate_slice_ids(cls, value: list[str] | None) -> list[str] | None:
        if value is None:
            return None
        normalized = [str(item or "").strip() for item in value]
        normalized = [item for item in normalized if item]
        if not normalized:
            raise ValueError("slice_ids must not be empty")
        if len(set(normalized)) != len(normalized):
            raise ValueError("slice_ids must not contain duplicates")
        return normalized


class StoryResponse(StoryBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class StoryListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    visibility: Literal["private"]
    step_count: int
    updated_at: datetime
