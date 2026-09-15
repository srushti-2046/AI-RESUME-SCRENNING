"""
main.py — Unified FastAPI Application for AI Resume Screening platform.
Consolidates all 9 screens under one authoritative, modular backend.
"""
import logging
import uuid

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.exceptions import HTTPException as StarletteHTTPException

from .config import get_settings
from .middleware.rate_limiter import RateLimitMiddleware
from .routers import (
    # Auth & Security
    auth,
    # Screen 1
    dashboard,
    # Screen 2
    resumes, jobs,
    # Screen 3
    candidates,
    # Screen 4
    analysis,
    # Screen 5
    ranking,
    # Screen 6
    ats,
    # Screen 7
    duplicate,
    # Screen 8
    assessments,
    # Screen 9
    settings, notifications, privacy, account, screening, team,
    email_prefs, integrations, retention, support, about,
    # Screen 10
    profile
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

_settings = get_settings()

app = FastAPI(
    title="AI Resume Screening — Unified Backend API",
    description="Consolidated FastAPI backend covering Screens 1 through 10.",
    version=_settings.app_version,
    docs_url=None if _settings.is_production else "/docs",
    redoc_url=None if _settings.is_production else "/redoc",
)

# 1. Rate Limiting Middleware (Executes on all incoming requests)
app.add_middleware(RateLimitMiddleware)

# 2. CORS Middleware — environment-driven origins with Vercel regex support
allowed_origins = [o for o in _settings.allowed_origins if o != "*"]
has_wildcard = "*" in _settings.allowed_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_origin_regex=r"^https?://.*" if has_wildcard else r"^https?://.*\.vercel\.app$|^https?://localhost(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# -----------------------------------------------------------------------------
# ROUTERS
# -----------------------------------------------------------------------------
# Auth & Security Routes (Strictest rate limits + exponential backoff)
app.include_router(auth.router)

# Screen 1: Dashboard
app.include_router(dashboard.router)

# Screen 2: Resume Upload & Job Requisitions
app.include_router(resumes.router)
app.include_router(jobs.router)

# Screen 3: Candidates
app.include_router(candidates.router)

# Screen 4: Analysis Result
app.include_router(analysis.router)

# Screen 5: Candidate Ranking
app.include_router(ranking.router)

# Screen 6: ATS Compatibility
app.include_router(ats.router)

# Screen 7: Duplicate Resume Detection
app.include_router(duplicate.router)

# Screen 8: Assessment Builder
app.include_router(assessments.router)

# Screen 9: Settings & Resources
app.include_router(settings.router)
app.include_router(notifications.router)
app.include_router(privacy.router)
app.include_router(account.router)
app.include_router(screening.router)
app.include_router(team.router)
app.include_router(email_prefs.router)
app.include_router(integrations.router)
app.include_router(retention.router)
app.include_router(support.router)
app.include_router(about.router)

# Screen 10: Profile
app.include_router(profile.router)


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "service": "unified-backend-api",
        "version": _settings.app_version,
        "screens_integrated": 10,
    }


# -----------------------------------------------------------------------------
# GLOBAL EXCEPTION HANDLERS (INFORMATION LEAKAGE PREVENTION)
# -----------------------------------------------------------------------------
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    detail = str(exc.detail)
    if exc.status_code >= 500:
        request_id = str(uuid.uuid4())[:8]
        logger.error(
            "HTTP 500 error [request_id=%s] %s %s: %s",
            request_id,
            request.method,
            request.url.path,
            detail,
        )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": f"An internal server error occurred. Reference ID: {request_id}",
                "request_id": request_id,
            },
            headers=dict(exc.headers or {}),
        )
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": detail},
        headers=dict(exc.headers or {}),
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):
    request_id = str(uuid.uuid4())[:8]
    logger.error(
        "Unhandled exception [request_id=%s] %s %s: %s",
        request_id,
        request.method,
        request.url.path,
        exc,
        exc_info=True,
    )
    # Strictly return generic message to prevent leaking stack traces, file paths, or DB tables
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"An internal server error occurred. Please contact support quoting reference ID: {request_id}",
            "request_id": request_id,
        },
    )
