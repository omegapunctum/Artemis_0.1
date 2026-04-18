import logging

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.auth.service import User, get_current_user, get_db
from app.observability import internal_error_response, log_event

from .schemas import CourseCreateRequest, CourseDetailResponse, CourseListItem
from .service import (
    create_course,
    delete_course,
    get_course,
    list_courses,
    serialize_course,
    serialize_course_list_item,
)

router = APIRouter(prefix="/courses", tags=["courses"])


@router.post("", response_model=CourseDetailResponse, status_code=status.HTTP_201_CREATED)
def create_course_endpoint(
    payload: CourseCreateRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = create_course(db, current_user, payload)
        return serialize_course(item)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "course.create.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, error=str(exc))
        return internal_error_response(request)


@router.get("", response_model=list[CourseListItem])
def list_courses_endpoint(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        items = list_courses(db, current_user)
        return [serialize_course_list_item(item) for item in items]
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "course.list.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, error=str(exc))
        return internal_error_response(request)


@router.get("/{course_id}", response_model=CourseDetailResponse)
def get_course_endpoint(
    course_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_course(db, current_user, course_id)
        return serialize_course(item)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "course.get.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, course_id=course_id, error=str(exc))
        return internal_error_response(request)


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_course_endpoint(
    course_id: str,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        item = get_course(db, current_user, course_id)
        delete_course(db, item)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "course.delete.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, course_id=course_id, error=str(exc))
        return internal_error_response(request)
