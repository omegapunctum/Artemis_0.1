from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from app.auth.migrations import apply_versioned_migrations
from app.auth.service import Base, User, engine
from app.stories.service import Story

from .schemas import CourseCreateRequest, CourseDetailResponse, CourseListItem


class Course(Base):
    __tablename__ = "courses"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False, default="")
    story_ids_json = Column(JSON, nullable=False)
    visibility = Column(String, nullable=False, default="private")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def _migration_create_courses(connection: Connection) -> None:
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS courses (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                description VARCHAR NOT NULL DEFAULT '',
                story_ids_json JSON NOT NULL,
                visibility VARCHAR NOT NULL DEFAULT 'private',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
    )
    connection.execute(
        text("CREATE INDEX IF NOT EXISTS ix_courses_user_id ON courses(user_id)")
    )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
        apply_versioned_migrations(
            connection,
            [
                (302, "courses_create_table", _migration_create_courses),
            ],
        )


def _validate_story_ids_owner(db: Session, user: User, story_ids: list[str]) -> list[str]:
    normalized = [str(item or "").strip() for item in story_ids]
    normalized = [item for item in normalized if item]
    if not normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="story_ids must not be empty")
    if len(set(normalized)) != len(normalized):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="story_ids must not contain duplicates")

    owned_ids = {
        row[0]
        for row in (
            db.query(Story.id)
            .filter(Story.user_id == user.id, Story.id.in_(normalized))
            .all()
        )
    }
    missing = [story_id for story_id in normalized if story_id not in owned_ids]
    if missing:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="story_ids must reference existing owner stories")
    return normalized


def create_course(db: Session, user: User, payload: CourseCreateRequest) -> Course:
    story_ids = _validate_story_ids_owner(db, user, payload.story_ids)
    item = Course(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        story_ids_json=story_ids,
        visibility="private",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def get_course(db: Session, user: User, course_id: str) -> Course:
    item = (
        db.query(Course)
        .filter(Course.id == course_id, Course.user_id == user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return item


def list_courses(db: Session, user: User) -> list[Course]:
    return (
        db.query(Course)
        .filter(Course.user_id == user.id)
        .order_by(Course.updated_at.desc())
        .all()
    )


def delete_course(db: Session, item: Course) -> None:
    db.delete(item)
    db.commit()


def serialize_course(item: Course) -> CourseDetailResponse:
    return CourseDetailResponse(
        id=item.id,
        title=item.title,
        description=item.description or "",
        story_ids=item.story_ids_json or [],
        visibility="private",
        owner_id=item.user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def serialize_course_list_item(item: Course) -> CourseListItem:
    story_ids = item.story_ids_json or []
    return CourseListItem(
        id=item.id,
        title=item.title,
        visibility="private",
        step_count=len(story_ids),
        updated_at=item.updated_at,
    )
