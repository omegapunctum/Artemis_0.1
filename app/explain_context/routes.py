import logging

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.auth.service import User, get_current_user, get_db
from app.observability import internal_error_response, log_event

from .schemas import ExplainContextRequest, ExplainContextResponse
from .service import get_explain_context

router = APIRouter(prefix="/explain-context", tags=["explain-context"])


@router.post("", response_model=ExplainContextResponse)
def explain_context_endpoint(
    payload: ExplainContextRequest,
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    request.state.user_id = current_user.id
    try:
        return get_explain_context(db, current_user, payload)
    except HTTPException:
        raise
    except Exception as exc:
        log_event(logging.ERROR, "explain_context.error", path=request.url.path, request_id=request.state.request_id, user_id=current_user.id, error=str(exc))
        return internal_error_response(request)
