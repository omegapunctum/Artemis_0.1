import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.service import User, get_current_user, get_db
from app.observability import internal_error_response, log_event

from .schemas import StoryCreate, StoryListItem, StoryResponse, StoryUpdate
from .service import (
    create_story,
    delete_user_story,
    get_user_story,
    list_user_stories,
    serialize_story,
    serialize_story_list_item,
    update_user_story,
)

router = APIRouter(prefix="/stories", tags=["stories"])


@router.post("", response_model=StoryResponse, status_code=status.HTTP_201_CREATED)
def create_story_endpoint(
    payload: StoryCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = create_story(db, current_user, payload)
        return serialize_story(item)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "story.create.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, error=str(exc))
        return internal_error_response(request)


@router.get("", response_model=list[StoryListItem])
def list_stories_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        items = list_user_stories(db, current_user)
        return [serialize_story_list_item(item) for item in items]
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "story.list.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, error=str(exc))
        return internal_error_response(request)


@router.get("/{story_id}", response_model=StoryResponse)
def get_story_endpoint(
    story_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_user_story(db, current_user, story_id)
        return serialize_story(item)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "story.get.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, story_id=story_id, error=str(exc))
        return internal_error_response(request)


@router.patch("/{story_id}", response_model=StoryResponse)
def patch_story_endpoint(
    story_id: str,
    payload: StoryUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_user_story(db, current_user, story_id)
        updated = update_user_story(db, current_user, item, payload)
        return serialize_story(updated)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "story.patch.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, story_id=story_id, error=str(exc))
        return internal_error_response(request)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story_endpoint(
    story_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_user_story(db, current_user, story_id)
        delete_user_story(db, item)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "story.delete.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, story_id=story_id, error=str(exc))
        return internal_error_response(request)
