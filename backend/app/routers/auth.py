"""
auth.py — Dedicated Authentication Router with Tiered Rate Limiting & Exponential Backoff.

Enforces:
1. Per-IP & Per-Account rate limiting on login, registration, and password reset.
2. Exponential backoff on repeated/failed authentication attempts.
3. Full configurability via Settings.
"""
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel, EmailStr, Field
from supabase import Client

from ..config import Settings, get_settings
from ..dependencies import get_supabase_client
from ..middleware.rate_limiter import RateLimiter, get_rate_limiter

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)


class SignupRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=128)
    full_name: Optional[str] = Field(None, min_length=1, max_length=120)


class ResetPasswordRequest(BaseModel):
    email: EmailStr


class AuthResponse(BaseModel):
    access_token: Optional[str] = None
    refresh_token: Optional[str] = None
    token_type: str = "bearer"
    user: Optional[dict] = None
    message: Optional[str] = None


@router.post("/login", response_model=AuthResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_rate_limiter),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Authenticate user credentials with strict per-IP and per-account rate limiting.
    Applies exponential backoff on failed attempts.
    """
    client_ip = limiter.get_client_ip(request)
    email = payload.email.strip().lower()

    # 1. Enforce per-IP and per-account attempt limits & backoff
    allowed, retry_after, reason = limiter.record_auth_attempt(client_ip, email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=reason,
            headers={"Retry-After": str(retry_after)},
        )

    # 2. Attempt authentication with Supabase
    try:
        auth_res = supabase.auth.sign_in_with_password(
            {"email": email, "password": payload.password}
        )
        if not auth_res or not auth_res.session:
            raise ValueError("Authentication credentials rejected.")

        # Success: Clear failure counters and any active backoff locks
        limiter.record_auth_success(client_ip, email)

        user_data = None
        if auth_res.user:
            user_data = {
                "id": str(auth_res.user.id),
                "email": str(auth_res.user.email),
                "user_metadata": auth_res.user.user_metadata or {},
            }

        return AuthResponse(
            access_token=auth_res.session.access_token,
            refresh_token=auth_res.session.refresh_token,
            user=user_data,
            message="Authenticated successfully",
        )

    except Exception as exc:
        # Failure: Apply exponential backoff
        backoff_sec = limiter.record_auth_failure(client_ip, email)
        logger.warning(
            "Failed login attempt for account %s from IP %s. Backoff delay: %ss",
            email,
            client_ip,
            backoff_sec,
        )

        err_msg = "Invalid login credentials."
        if backoff_sec > 0:
            err_msg += f" Too many failed attempts. Temporary backoff active for {backoff_sec} seconds."

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=err_msg,
            headers={"Retry-After": str(backoff_sec)} if backoff_sec > 0 else {},
        )


@router.post("/signup", response_model=AuthResponse)
async def signup(
    payload: SignupRequest,
    request: Request,
    settings: Settings = Depends(get_settings),
    limiter: RateLimiter = Depends(get_rate_limiter),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Register a new recruiter account with rate limiting safeguards.
    """
    client_ip = limiter.get_client_ip(request)
    email = payload.email.strip().lower()

    # Check attempt limits & backoff
    allowed, retry_after, reason = limiter.record_auth_attempt(client_ip, email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=reason,
            headers={"Retry-After": str(retry_after)},
        )

    try:
        sign_up_options = {}
        if payload.full_name:
            sign_up_options["data"] = {"full_name": payload.full_name.strip()}

        auth_res = supabase.auth.sign_up(
            {
                "email": email,
                "password": payload.password,
                "options": sign_up_options,
            }
        )

        limiter.record_auth_success(client_ip, email)

        user_data = None
        access_token = None
        refresh_token = None

        if auth_res.user:
            user_data = {
                "id": str(auth_res.user.id),
                "email": str(auth_res.user.email),
                "user_metadata": auth_res.user.user_metadata or {},
            }
        if auth_res.session:
            access_token = auth_res.session.access_token
            refresh_token = auth_res.session.refresh_token

        return AuthResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            user=user_data,
            message="Account registration successful",
        )

    except Exception as exc:
        limiter.record_auth_failure(client_ip, email)
        logger.error("Signup failed for %s: %s", email, exc)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc) or "Failed to register account.",
        )


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    request: Request,
    limiter: RateLimiter = Depends(get_rate_limiter),
    supabase: Client = Depends(get_supabase_client),
):
    """
    Initiate password reset with rate limiting against automated spamming.
    """
    client_ip = limiter.get_client_ip(request)
    email = payload.email.strip().lower()

    allowed, retry_after, reason = limiter.record_auth_attempt(client_ip, email)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=reason,
            headers={"Retry-After": str(retry_after)},
        )

    try:
        supabase.auth.reset_password_for_email(email)
    except Exception as exc:
        logger.warning("Password reset failed for %s: %s", email, exc)
        # Even on internal failure or non-existent email, return generic safe message
        # to avoid account enumeration.

    return {
        "message": "If an account exists with this email, password reset instructions have been dispatched.",
        "email": email,
    }


@router.get("/status")
async def auth_rate_limit_status(
    request: Request,
    email: Optional[str] = None,
    limiter: RateLimiter = Depends(get_rate_limiter),
):
    """
    Diagnostic endpoint to query whether rate limit backoff is currently active for this IP / account.
    """
    client_ip = limiter.get_client_ip(request)
    allowed, retry_after, reason = limiter.check_auth_lockout(client_ip, email)
    return {
        "rate_limit_active": not allowed,
        "retry_after_seconds": retry_after,
        "detail": reason if not allowed else "Normal traffic permitted",
    }
