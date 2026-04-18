from __future__ import annotations

from datetime import datetime
from uuid import uuid4

from fastapi import HTTPException, status
from sqlalchemy import JSON, Column, DateTime, ForeignKey, String, text
from sqlalchemy.engine import Connection
from sqlalchemy.orm import Session

from app.auth.migrations import apply_versioned_migrations
from app.auth.service import Base, User, engine
from app.research_slices.service import ResearchSlice

from .schemas import StoryCreate, StoryListItem, StoryResponse, StoryUpdate


class Story(Base):
    __tablename__ = "stories"

    id = Column(String, primary_key=True, default=lambda: str(uuid4()))
    user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String, nullable=False)
    description = Column(String, nullable=False, default="")
    slice_ids_json = Column(JSON, nullable=False)
    visibility = Column(String, nullable=False, default="private")
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)


def _migration_create_stories(connection: Connection) -> None:
    connection.execute(
        text(
            """
            CREATE TABLE IF NOT EXISTS stories (
                id VARCHAR PRIMARY KEY,
                user_id VARCHAR NOT NULL,
                title VARCHAR NOT NULL,
                description VARCHAR NOT NULL DEFAULT '',
                slice_ids_json JSON NOT NULL,
                visibility VARCHAR NOT NULL DEFAULT 'private',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
            """
        )
    )
    connection.execute(
        text("CREATE INDEX IF NOT EXISTS ix_stories_user_id ON stories(user_id)")
    )


def init_db() -> None:
    Base.metadata.create_all(bind=engine)

    with engine.begin() as connection:
        apply_versioned_migrations(
            connection,
            [
                (301, "stories_create_table", _migration_create_stories),
            ],
        )


def _validate_slice_ids_owner(db: Session, user: User, slice_ids: list[str]) -> list[str]:
    normalized = [str(item or "").strip() for item in slice_ids]
    normalized = [item for item in normalized if item]
    if not normalized:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="slice_ids must not be empty")
    if len(set(normalized)) != len(normalized):
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="slice_ids must not contain duplicates")

    owned_ids = {
        row[0]
        for row in (
            db.query(ResearchSlice.id)
            .filter(ResearchSlice.user_id == user.id, ResearchSlice.id.in_(normalized))
            .all()
        )
    }
    missing = [slice_id for slice_id in normalized if slice_id not in owned_ids]
    if missing:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="slice_ids must reference existing owner slices")
    return normalized


def create_story(db: Session, user: User, payload: StoryCreate) -> Story:
    slice_ids = _validate_slice_ids_owner(db, user, payload.slice_ids)
    item = Story(
        user_id=user.id,
        title=payload.title,
        description=payload.description,
        slice_ids_json=slice_ids,
        visibility="private",
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return item


def list_user_stories(db: Session, user: User) -> list[Story]:
    return (
        db.query(Story)
        .filter(Story.user_id == user.id)
        .order_by(Story.updated_at.desc())
        .all()
    )


def get_user_story(db: Session, user: User, story_id: str) -> Story:
    item = (
        db.query(Story)
        .filter(Story.id == story_id, Story.user_id == user.id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Story not found")
    return item


def update_user_story(db: Session, user: User, item: Story, payload: StoryUpdate) -> Story:
    changes = payload.model_dump(exclude_unset=True)

    if "title" in changes:
        item.title = changes["title"]
    if "description" in changes:
        item.description = changes["description"]
    if "slice_ids" in changes:
        item.slice_ids_json = _validate_slice_ids_owner(db, user, changes["slice_ids"] or [])

    item.visibility = "private"

    db.commit()
    db.refresh(item)
    return item


def delete_user_story(db: Session, item: Story) -> None:
    db.delete(item)
    db.commit()


def serialize_story(item: Story) -> StoryResponse:
    return StoryResponse(
        id=item.id,
        title=item.title,
        description=item.description or "",
        slice_ids=item.slice_ids_json or [],
        visibility="private",
        owner_id=item.user_id,
        created_at=item.created_at,
        updated_at=item.updated_at,
    )


def serialize_story_list_item(item: Story) -> StoryListItem:
    slice_ids = item.slice_ids_json or []
    return StoryListItem(
        id=item.id,
        title=item.title,
        visibility="private",
        step_count=len(slice_ids),
        updated_at=item.updated_at,
    )
