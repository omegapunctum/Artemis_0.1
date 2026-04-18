from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class ExplainContextRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: Literal["slice", "story", "course"]
    slice_id: str | None = None
    story_id: str | None = None
    course_id: str | None = None

    @model_validator(mode="after")
    def validate_scope_id_pair(self) -> "ExplainContextRequest":
        if self.scope == "slice" and not str(self.slice_id or "").strip():
            raise ValueError("slice_id is required for scope=slice")
        if self.scope == "story" and not str(self.story_id or "").strip():
            raise ValueError("story_id is required for scope=story")
        if self.scope == "course" and not str(self.course_id or "").strip():
            raise ValueError("course_id is required for scope=course")
        return self


class ExplainContextResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    scope: Literal["slice", "story", "course"]
    slice_id: str | None = None
    story_id: str | None = None
    course_id: str | None = None
    feature_ids: list[str] = Field(default_factory=list)
    time_range: dict[str, Any] | None = None
    view_state: dict[str, Any] | None = None
    annotations: list[dict[str, Any]] = Field(default_factory=list)
