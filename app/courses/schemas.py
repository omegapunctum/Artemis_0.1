from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


class CourseBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    title: str = Field(min_length=1, max_length=180)
    description: str = Field(default="", max_length=4000)
    story_ids: list[str]
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

    @field_validator("story_ids")
    @classmethod
    def validate_story_ids(cls, value: list[str]) -> list[str]:
        normalized = [str(item or "").strip() for item in value]
        normalized = [item for item in normalized if item]
        if not normalized:
            raise ValueError("story_ids must not be empty")
        if len(set(normalized)) != len(normalized):
            raise ValueError("story_ids must not contain duplicates")
        return normalized


class CourseCreateRequest(CourseBase):
    pass


class CourseDetailResponse(CourseBase):
    id: str
    owner_id: str
    created_at: datetime
    updated_at: datetime


class CourseListItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    title: str
    visibility: Literal["private"]
    step_count: int
    updated_at: datetime
