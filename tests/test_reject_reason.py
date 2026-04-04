from types import SimpleNamespace
from uuid import uuid4

from app.auth.service import SessionLocal, User, init_db
from app.auth.utils import hash_password
from app.drafts.service import Draft, create_draft, init_db as init_drafts_db
from app.moderation.routes import RejectPayload, reject_draft_endpoint
from app.moderation.service import submit_draft_for_review


def _request(path: str):
    return SimpleNamespace(state=SimpleNamespace(request_id="test-request-id", user_id=None), url=SimpleNamespace(path=path))


def _create_user(db, *, is_admin: bool = False) -> User:
    user = User(email=f"reject-{uuid4().hex}@example.com", password_hash=hash_password("password123"), is_admin=is_admin)
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _pending_draft(db):
    author = _create_user(db, is_admin=False)
    moderator = _create_user(db, is_admin=True)
    draft = create_draft(db, author, "Draft title", "Draft description", None, payload={"name_ru": "Draft title"})
    draft = submit_draft_for_review(db, draft)
    return draft, moderator


def test_reject_with_reason_persists_and_returns_reason():
    init_db()
    init_drafts_db()
    db = SessionLocal()
    db.query(Draft).delete()
    db.query(User).delete()
    db.commit()

    draft, moderator = _pending_draft(db)

    response = reject_draft_endpoint(
        draft.id,
        _request(f"/api/moderation/{draft.id}/reject"),
        payload=RejectPayload(reason="Duplicate item"),
        _=None,
        db=db,
        current_user=moderator,
    )

    assert response["status"] == "rejected"
    assert response["rejection_reason"] == "Duplicate item"

    refreshed = db.query(Draft).filter(Draft.id == draft.id).first()
    assert refreshed.payload.get("rejection_reason") == "Duplicate item"
    db.close()


def test_reject_without_reason_is_backward_compatible():
    init_db()
    init_drafts_db()
    db = SessionLocal()
    db.query(Draft).delete()
    db.query(User).delete()
    db.commit()

    draft, moderator = _pending_draft(db)

    response = reject_draft_endpoint(
        draft.id,
        _request(f"/api/moderation/{draft.id}/reject"),
        payload=None,
        _=None,
        db=db,
        current_user=moderator,
    )

    assert response["status"] == "rejected"
    assert response.get("rejection_reason") is None

    refreshed = db.query(Draft).filter(Draft.id == draft.id).first()
    assert (refreshed.payload or {}).get("rejection_reason") is None
    db.close()


def test_reject_with_blank_reason_does_not_store_empty_value():
    init_db()
    init_drafts_db()
    db = SessionLocal()
    db.query(Draft).delete()
    db.query(User).delete()
    db.commit()

    draft, moderator = _pending_draft(db)

    response = reject_draft_endpoint(
        draft.id,
        _request(f"/api/moderation/{draft.id}/reject"),
        payload=RejectPayload(reason="   "),
        _=None,
        db=db,
        current_user=moderator,
    )

    assert response["status"] == "rejected"
    assert response.get("rejection_reason") is None

    refreshed = db.query(Draft).filter(Draft.id == draft.id).first()
    assert (refreshed.payload or {}).get("rejection_reason") is None
    db.close()
