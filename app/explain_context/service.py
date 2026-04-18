from __future__ import annotations

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.auth.service import User
from app.courses.service import get_course
from app.research_slices.service import get_user_research_slice
from app.stories.service import get_user_story

from .schemas import ExplainContextRequest, ExplainContextResponse


def _extract_slice_payload(slice_item) -> tuple[list[str], dict, dict, list[dict]]:
    refs = slice_item.feature_refs_json or []
    feature_ids = [str(entry.get("feature_id") or "").strip() for entry in refs if isinstance(entry, dict)]
    feature_ids = [item for item in feature_ids if item]
    return (
        feature_ids,
        slice_item.time_range_json or {},
        slice_item.view_state_json or {},
        slice_item.annotations_json or [],
    )


def build_context_from_slice(slice_item) -> ExplainContextResponse:
    feature_ids, time_range, view_state, annotations = _extract_slice_payload(slice_item)
    return ExplainContextResponse(
        scope="slice",
        slice_id=slice_item.id,
        feature_ids=feature_ids,
        time_range=time_range,
        view_state=view_state,
        annotations=annotations,
    )


def build_context_from_story(db: Session, user: User, story_item) -> ExplainContextResponse:
    slice_ids = story_item.slice_ids_json or []
    if not slice_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Story has no slices")
    current_slice_id = str(slice_ids[0] or "").strip()
    slice_item = get_user_research_slice(db, user, current_slice_id)
    feature_ids, time_range, view_state, annotations = _extract_slice_payload(slice_item)
    return ExplainContextResponse(
        scope="story",
        slice_id=slice_item.id,
        story_id=story_item.id,
        feature_ids=feature_ids,
        time_range=time_range,
        view_state=view_state,
        annotations=annotations,
    )


def build_context_from_course(db: Session, user: User, course_item) -> ExplainContextResponse:
    story_ids = course_item.story_ids_json or []
    if not story_ids:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Course has no stories")
    current_story_id = str(story_ids[0] or "").strip()
    story_item = get_user_story(db, user, current_story_id)
    story_context = build_context_from_story(db, user, story_item)
    return ExplainContextResponse(
        scope="course",
        slice_id=story_context.slice_id,
        story_id=story_item.id,
        course_id=course_item.id,
        feature_ids=story_context.feature_ids,
        time_range=story_context.time_range,
        view_state=story_context.view_state,
        annotations=story_context.annotations,
    )


def get_explain_context(db: Session, user: User, payload: ExplainContextRequest) -> ExplainContextResponse:
    if payload.scope == "slice":
        slice_item = get_user_research_slice(db, user, str(payload.slice_id or "").strip())
        return build_context_from_slice(slice_item)

    if payload.scope == "story":
        story_item = get_user_story(db, user, str(payload.story_id or "").strip())
        return build_context_from_story(db, user, story_item)

    if payload.scope == "course":
        course_item = get_course(db, user, str(payload.course_id or "").strip())
        return build_context_from_course(db, user, course_item)

    raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Unsupported scope")
