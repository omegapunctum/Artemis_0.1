import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.service import User, get_current_user, get_db
from app.observability import internal_error_response, log_event

from .schemas import ResearchSliceCreate, ResearchSliceListItem, ResearchSliceResponse, ResearchSliceUpdate
from .service import (
    create_research_slice,
    delete_user_research_slice,
    get_user_research_slice,
    list_user_research_slices,
    serialize_research_slice,
    serialize_research_slice_list_item,
    update_user_research_slice,
)

router = APIRouter(prefix="/research-slices", tags=["research-slices"])


@router.post("", response_model=ResearchSliceResponse, status_code=status.HTTP_201_CREATED)
def create_research_slice_endpoint(
    payload: ResearchSliceCreate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = create_research_slice(db, current_user, payload)
        return serialize_research_slice(item)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "research_slice.create.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, error=str(exc))
        return internal_error_response(request)


@router.get("", response_model=list[ResearchSliceListItem])
def list_research_slices_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        items = list_user_research_slices(db, current_user)
        return [serialize_research_slice_list_item(item) for item in items]
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "research_slice.list.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, error=str(exc))
        return internal_error_response(request)


@router.get("/{slice_id}", response_model=ResearchSliceResponse)
def get_research_slice_endpoint(
    slice_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_user_research_slice(db, current_user, slice_id)
        return serialize_research_slice(item)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "research_slice.get.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, slice_id=slice_id, error=str(exc))
        return internal_error_response(request)


@router.patch("/{slice_id}", response_model=ResearchSliceResponse)
def patch_research_slice_endpoint(
    slice_id: str,
    payload: ResearchSliceUpdate,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_user_research_slice(db, current_user, slice_id)

        merged_feature_refs = payload.feature_refs if payload.feature_refs is not None else (item.feature_refs_json or [])
        merged_selected_feature_id = (
            payload.view_state.selected_feature_id
            if payload.view_state is not None
            else str((item.view_state_json or {}).get("selected_feature_id") or "").strip() or None
        )
        if merged_selected_feature_id:
            allowed_ids = {
                ref.feature_id if hasattr(ref, "feature_id") else str(ref.get("feature_id", "")).strip()
                for ref in merged_feature_refs
            }
            if merged_selected_feature_id not in allowed_ids:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="view_state.selected_feature_id must reference feature_refs",
                )

        updated = update_user_research_slice(db, item, payload)
        return serialize_research_slice(updated)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "research_slice.patch.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, slice_id=slice_id, error=str(exc))
        return internal_error_response(request)


@router.delete("/{slice_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_research_slice_endpoint(
    slice_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_user_research_slice(db, current_user, slice_id)
        delete_user_research_slice(db, item)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "research_slice.delete.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, slice_id=slice_id, error=str(exc))
        return internal_error_response(request)
