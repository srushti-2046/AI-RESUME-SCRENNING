"""
rate_limiter.py — Multi-tier, configurable Rate Limiter for AI Resume Screening Backend.

Provides:
1. Strictest tier: Authentication routes with per-IP and per-account exponential backoff.
2. Moderate tier: Public endpoints (health checks, public assessment links).
3. Looser tier: Authenticated recruiter user actions.
4. FastAPI BaseHTTPMiddleware for transparent application-wide rate limiting and RFC headers.
"""
import enum
import logging
import math
import re
import threading
import time
from collections import deque
from typing import Optional, Tuple

from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

from ..config import Settings, get_settings

logger = logging.getLogger(__name__)


class EndpointTier(str, enum.Enum):
    AUTH = "auth"
    PUBLIC = "public"
    AUTHENTICATED = "authenticated"


class RateLimiter:
    """
    Thread-safe in-memory rate limiter with sliding window tracking and exponential backoff.
    Thresholds and windows are loaded dynamically from Settings.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self._settings = settings or get_settings()
        self._lock = threading.Lock()

        # Sliding window timestamps for public and authenticated requests:
        # key -> deque([timestamp_1, timestamp_2, ...])
        self._public_ip_requests: dict[str, deque[float]] = {}
        self._auth_user_requests: dict[str, deque[float]] = {}

        # Auth route tracking:
        self._auth_ip_attempts: dict[str, deque[float]] = {}
        self._auth_ip_failures: dict[str, int] = {}
        self._auth_ip_lock_until: dict[str, float] = {}

        self._auth_account_attempts: dict[str, deque[float]] = {}
        self._auth_account_failures: dict[str, int] = {}
        self._auth_account_lock_until: dict[str, float] = {}

    def get_settings(self) -> Settings:
        return self._settings

    def update_settings(self, settings: Settings) -> None:
        with self._lock:
            self._settings = settings

    def reset(self) -> None:
        """Clear all rate limit state (useful in tests)."""
        with self._lock:
            self._public_ip_requests.clear()
            self._auth_user_requests.clear()
            self._auth_ip_attempts.clear()
            self._auth_ip_failures.clear()
            self._auth_ip_lock_until.clear()
            self._auth_account_attempts.clear()
            self._auth_account_failures.clear()
            self._auth_account_lock_until.clear()

    @staticmethod
    def get_client_ip(request: Request) -> str:
        """Extract real client IP, respecting proxy headers if present."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            # First IP in X-Forwarded-For is the originating client IP
            first_ip = forwarded_for.split(",")[0].strip()
            if first_ip:
                return first_ip

        real_ip = request.headers.get("x-real-ip")
        if real_ip and real_ip.strip():
            return real_ip.strip()

        if request.client and request.client.host:
            return request.client.host

        return "127.0.0.1"

    @staticmethod
    def normalize_email(email: Optional[str]) -> Optional[str]:
        if not email:
            return None
        return email.strip().lower()

    # -------------------------------------------------------------------------
    # PUBLIC TIER
    # -------------------------------------------------------------------------
    def check_public_limit(self, ip: str) -> Tuple[bool, int, int, int]:
        """
        Check rate limit for public endpoints.
        Returns: (is_allowed, limit, remaining, retry_after_seconds)
        """
        if not self._settings.rate_limit_enabled:
            return True, 9999, 9999, 0

        now = time.time()
        window = float(self._settings.rate_limit_public_window_seconds)
        limit = self._settings.rate_limit_public_max

        with self._lock:
            history = self._public_ip_requests.setdefault(ip, deque())
            # Clean expired
            while history and history[0] <= now - window:
                history.popleft()

            if len(history) >= limit:
                oldest = history[0]
                retry_after = max(1, math.ceil(oldest + window - now))
                return False, limit, 0, retry_after

            history.append(now)
            remaining = max(0, limit - len(history))
            return True, limit, remaining, 0

    # -------------------------------------------------------------------------
    # AUTHENTICATED TIER
    # -------------------------------------------------------------------------
    def check_authenticated_limit(self, user_key: str) -> Tuple[bool, int, int, int]:
        """
        Check rate limit for authenticated user actions.
        Returns: (is_allowed, limit, remaining, retry_after_seconds)
        """
        if not self._settings.rate_limit_enabled:
            return True, 9999, 9999, 0

        now = time.time()
        window = float(self._settings.rate_limit_auth_user_window_seconds)
        limit = self._settings.rate_limit_auth_user_max

        with self._lock:
            history = self._auth_user_requests.setdefault(user_key, deque())
            # Clean expired
            while history and history[0] <= now - window:
                history.popleft()

            if len(history) >= limit:
                oldest = history[0]
                retry_after = max(1, math.ceil(oldest + window - now))
                return False, limit, 0, retry_after

            history.append(now)
            remaining = max(0, limit - len(history))
            return True, limit, remaining, 0

    # -------------------------------------------------------------------------
    # AUTH ROUTES: PER-IP & PER-ACCOUNT WITH EXPONENTIAL BACKOFF
    # -------------------------------------------------------------------------
    def check_auth_lockout(
        self, ip: str, email: Optional[str] = None
    ) -> Tuple[bool, int, str]:
        """
        Check if the IP or account is currently subjected to exponential backoff.
        Returns: (is_allowed, retry_after_seconds, reason)
        """
        if not self._settings.rate_limit_enabled:
            return True, 0, ""

        now = time.time()
        norm_email = self.normalize_email(email)

        with self._lock:
            # Check IP lock
            ip_lock = self._auth_ip_lock_until.get(ip, 0.0)
            if now < ip_lock:
                retry_after = max(1, math.ceil(ip_lock - now))
                return (
                    False,
                    retry_after,
                    f"Too many failed authentication attempts from this IP. Please try again in {retry_after}s.",
                )

            # Check Account lock
            if norm_email:
                acc_lock = self._auth_account_lock_until.get(norm_email, 0.0)
                if now < acc_lock:
                    retry_after = max(1, math.ceil(acc_lock - now))
                    return (
                        False,
                        retry_after,
                        f"Too many failed login attempts for this account. Please try again in {retry_after}s.",
                    )

        return True, 0, ""

    def record_auth_attempt(
        self, ip: str, email: Optional[str] = None
    ) -> Tuple[bool, int, str]:
        """
        Record an incoming attempt to an auth route. Checks if limits were exceeded.
        If exceeded, immediately activates exponential backoff.
        Returns: (is_allowed, retry_after_seconds, reason)
        """
        if not self._settings.rate_limit_enabled:
            return True, 0, ""

        # First check active locks
        allowed, retry_after, reason = self.check_auth_lockout(ip, email)
        if not allowed:
            return False, retry_after, reason

        now = time.time()
        window = float(self._settings.rate_limit_auth_window_seconds)
        ip_limit = self._settings.rate_limit_auth_per_ip_max
        acc_limit = self._settings.rate_limit_auth_per_account_max
        base_backoff = float(self._settings.rate_limit_auth_backoff_base_seconds)
        max_backoff = float(self._settings.rate_limit_auth_backoff_max_seconds)

        norm_email = self.normalize_email(email)

        with self._lock:
            # 1. IP attempt history
            ip_hist = self._auth_ip_attempts.setdefault(ip, deque())
            while ip_hist and ip_hist[0] <= now - window:
                ip_hist.popleft()

            if len(ip_hist) >= ip_limit:
                # Trigger IP exponential backoff
                failures = self._auth_ip_failures.get(ip, 0) + 1
                self._auth_ip_failures[ip] = failures
                excess = max(0, failures - ip_limit)
                delay = min(base_backoff * (2 ** excess), max_backoff)
                self._auth_ip_lock_until[ip] = now + delay
                retry_sec = max(1, math.ceil(delay))
                return (
                    False,
                    retry_sec,
                    f"Too many authentication requests from this IP. Rate limit backoff applied ({retry_sec}s).",
                )

            ip_hist.append(now)

            # 2. Account attempt history (if email provided)
            if norm_email:
                acc_hist = self._auth_account_attempts.setdefault(norm_email, deque())
                while acc_hist and acc_hist[0] <= now - window:
                    acc_hist.popleft()

                if len(acc_hist) >= acc_limit:
                    failures = self._auth_account_failures.get(norm_email, 0) + 1
                    self._auth_account_failures[norm_email] = failures
                    excess = max(0, failures - acc_limit)
                    delay = min(base_backoff * (2 ** excess), max_backoff)
                    self._auth_account_lock_until[norm_email] = now + delay
                    retry_sec = max(1, math.ceil(delay))
                    return (
                        False,
                        retry_sec,
                        f"Too many authentication requests for this account. Rate limit backoff applied ({retry_sec}s).",
                    )

                acc_hist.append(now)

        return True, 0, ""

    def record_auth_failure(self, ip: str, email: Optional[str] = None) -> int:
        """
        Record a failed login or authentication attempt (e.g. invalid password).
        Calculates and applies exponential backoff for the offending IP and account.
        Returns the computed backoff duration in seconds.
        """
        if not self._settings.rate_limit_enabled:
            return 0

        now = time.time()
        ip_limit = self._settings.rate_limit_auth_per_ip_max
        acc_limit = self._settings.rate_limit_auth_per_account_max
        base_backoff = float(self._settings.rate_limit_auth_backoff_base_seconds)
        max_backoff = float(self._settings.rate_limit_auth_backoff_max_seconds)

        norm_email = self.normalize_email(email)
        max_delay = 0.0

        with self._lock:
            # IP failures
            ip_fails = self._auth_ip_failures.get(ip, 0) + 1
            self._auth_ip_failures[ip] = ip_fails
            if ip_fails >= ip_limit:
                excess = ip_fails - ip_limit
                ip_delay = min(base_backoff * (2 ** excess), max_backoff)
                self._auth_ip_lock_until[ip] = max(
                    self._auth_ip_lock_until.get(ip, 0.0), now + ip_delay
                )
                max_delay = max(max_delay, ip_delay)

            # Account failures
            if norm_email:
                acc_fails = self._auth_account_failures.get(norm_email, 0) + 1
                self._auth_account_failures[norm_email] = acc_fails
                if acc_fails >= acc_limit:
                    excess = acc_fails - acc_limit
                    acc_delay = min(base_backoff * (2 ** excess), max_backoff)
                    self._auth_account_lock_until[norm_email] = max(
                        self._auth_account_lock_until.get(norm_email, 0.0),
                        now + acc_delay,
                    )
                    max_delay = max(max_delay, acc_delay)

        return math.ceil(max_delay)

    def record_auth_success(self, ip: str, email: Optional[str] = None) -> None:
        """
        On successful authentication, clear backoff locks and reset failure counters
        for this account and IP to ensure legitimate users regain immediate access.
        """
        norm_email = self.normalize_email(email)
        with self._lock:
            self._auth_ip_failures.pop(ip, None)
            self._auth_ip_lock_until.pop(ip, None)
            if norm_email:
                self._auth_account_failures.pop(norm_email, None)
                self._auth_account_lock_until.pop(norm_email, None)


# Global singleton rate limiter instance
_global_rate_limiter = RateLimiter()


def get_rate_limiter() -> RateLimiter:
    return _global_rate_limiter


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI HTTP Middleware that automatically classifies endpoints into:
      - Auth Tier: /api/auth/*
      - Public Tier: /health, /docs, /redoc, /api/assessments/public/*
      - Authenticated Tier: /api/* with Bearer token
    and enforces appropriate limits with RFC-compliant headers and 429 backoff responses.
    """

    def __init__(self, app, limiter: Optional[RateLimiter] = None):
        super().__init__(app)
        self.limiter = limiter or get_rate_limiter()

    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # 1. Skip preflight CORS requests
        if request.method == "OPTIONS":
            return await call_next(request)

        path = request.url.path
        client_ip = self.limiter.get_client_ip(request)

        # 2. Identify Endpoint Tier
        if path.startswith("/api/auth/"):
            # Auth Tier: Pre-check IP lockout before delegating to route
            allowed, retry_after, reason = self.limiter.check_auth_lockout(client_ip)
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": reason,
                        "retry_after": retry_after,
                        "tier": EndpointTier.AUTH.value,
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Tier": EndpointTier.AUTH.value,
                    },
                )
            response = await call_next(request)
            response.headers["X-RateLimit-Tier"] = EndpointTier.AUTH.value
            return response

        # Public endpoints
        is_public = (
            path in ["/health", "/docs", "/redoc", "/openapi.json"]
            or path.startswith("/api/assessments/public/")
        )

        auth_header = request.headers.get("authorization", "")
        has_bearer = auth_header.startswith("Bearer ") and len(auth_header) > 15

        if is_public or not has_bearer:
            # Public Tier
            allowed, limit, remaining, retry_after = self.limiter.check_public_limit(
                client_ip
            )
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Too many requests. Please try again in {retry_after} seconds.",
                        "retry_after": retry_after,
                        "tier": EndpointTier.PUBLIC.value,
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Tier": EndpointTier.PUBLIC.value,
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Tier"] = EndpointTier.PUBLIC.value
            return response

        else:
            # Authenticated Recruiter Tier
            # Extract user identifier from Bearer token or token prefix
            token = auth_header[7:].strip()
            # Fast identifier: use first 32 chars or full token as user key for rate tracking
            user_key = f"user_{token[:32]}"

            allowed, limit, remaining, retry_after = (
                self.limiter.check_authenticated_limit(user_key)
            )
            if not allowed:
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": f"Authenticated user rate limit exceeded. Please try again in {retry_after} seconds.",
                        "retry_after": retry_after,
                        "tier": EndpointTier.AUTHENTICATED.value,
                    },
                    headers={
                        "Retry-After": str(retry_after),
                        "X-RateLimit-Limit": str(limit),
                        "X-RateLimit-Remaining": "0",
                        "X-RateLimit-Tier": EndpointTier.AUTHENTICATED.value,
                    },
                )

            response = await call_next(request)
            response.headers["X-RateLimit-Limit"] = str(limit)
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            response.headers["X-RateLimit-Tier"] = EndpointTier.AUTHENTICATED.value
            return response
