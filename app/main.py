from pathlib import Path
import logging
import os
from collections.abc import Callable

from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.auth.routes import router as auth_router
from app.auth.schemas import UserResponse
from app.auth.service import User, get_current_user, init_db as init_auth_db
from app.courses.routes import router as courses_router
from app.drafts.routes import router as drafts_router
from app.explain_context.routes import router as explain_context_router
from app.courses.service import init_db as init_courses_db
from app.drafts.service import init_db as init_drafts_db
from app.research_slices.service import init_db as init_research_slices_db
from app.stories.service import init_db as init_stories_db
from app.moderation.routes import router as moderation_router
from app.routes.map import router as map_router
from app.research_slices.routes import router as research_slices_router
from app.stories.routes import router as stories_router
from app.observability import (
    ObservabilityMiddleware,
    health_payload,
    http_exception_handler,
    setup_logging,
    log_event,
    internal_error_response,
    unhandled_exception_handler,
    validation_exception_handler,
)
from app.uploads.routes import router as uploads_router

setup_logging()

DEV_LIKE_ENVS = {"development", "dev", "testing", "test", "local"}


def _normalized_runtime_env() -> str:
    return (os.getenv("APP_ENV") or os.getenv("ENV") or "development").strip().lower()


def _configured_migration_startup_role() -> str | None:
    raw_value = os.getenv("MIGRATION_STARTUP_ROLE", "").strip().lower()
    return raw_value or None


def _resolve_migration_startup_role(*, runtime_env: str, configured_role: str | None) -> str:
    if configured_role in {"owner", "non-owner"}:
        return configured_role

    if configured_role is not None:
        raise RuntimeError("MIGRATION_STARTUP_ROLE must be either 'owner' or 'non-owner'")

    if runtime_env in DEV_LIKE_ENVS:
        return "owner"

    raise RuntimeError(
        "MIGRATION_STARTUP_ROLE must be explicitly set to 'owner' or 'non-owner' "
        "outside development/testing/local aliases"
    )


def _run_startup_migration_apply_sequence(
    *,
    startup_role: str,
    init_functions: tuple[Callable[[], None], ...],
) -> bool:
    if startup_role == "non-owner":
        logging.getLogger(__name__).info("Skipping startup migration apply path on non-owner instance")
        return False

    for init_fn in init_functions:
        init_fn()
    return True


STARTUP_MIGRATION_ROLE = _resolve_migration_startup_role(
    runtime_env=_normalized_runtime_env(),
    configured_role=_configured_migration_startup_role(),
)
_run_startup_migration_apply_sequence(
    startup_role=STARTUP_MIGRATION_ROLE,
    init_functions=(
        init_auth_db,
        init_drafts_db,
        init_research_slices_db,
        init_stories_db,
        init_courses_db,
    ),
)

UPLOADS_DIR = "uploads"
Path(UPLOADS_DIR).mkdir(parents=True, exist_ok=True)

app = FastAPI(title="ARTEMIS API")
app.add_middleware(ObservabilityMiddleware)

allowed_origins = [
    origin.strip()
    for origin in os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:8000,http://127.0.0.1:8000").split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.middleware("http")
async def uploads_static_headers_middleware(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/uploads/"):
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Content-Disposition"] = "inline"
        response.headers["Cache-Control"] = "no-store"
    return response


for router in (auth_router, drafts_router, uploads_router, moderation_router, map_router, research_slices_router, stories_router, courses_router, explain_context_router):
    app.include_router(router, prefix="/api")

app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")


@app.get("/api/health")
def health(request: Request):
    try:
        return health_payload()
    except Exception as exc:
        log_event(logging.ERROR, 'health.error', path=request.url.path, request_id=getattr(request.state, 'request_id', None), error=str(exc))
        return internal_error_response(request)


@app.get("/api/me", response_model=UserResponse)
def me(current_user: User = Depends(get_current_user)):
    return {"id": current_user.id, "email": current_user.email, "is_admin": bool(current_user.is_admin)}
