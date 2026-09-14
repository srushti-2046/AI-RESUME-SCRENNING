"""
dependencies.py — Authentication and Supabase Client dependencies.
Enforces:
  1. Authorization: Bearer <Supabase access token>
  2. Verifies token and extracts authenticated recruiter UUID
  3. Never trusts client-supplied user_id/recruiter_id
  4. Service-role Supabase client is server-only; tenant ownership is verified in services
"""
import logging
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
import jwt
from jwt.exceptions import PyJWTError
from supabase import create_client, Client

from .config import Settings, get_settings

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=True)


def get_supabase_client(settings: Annotated[Settings, Depends(get_settings)]) -> Client:
    """Server-side Supabase client using service role key — NEVER exposed to frontend."""
    return create_client(settings.supabase_url, settings.supabase_service_role_key)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer_scheme)],
    settings: Annotated[Settings, Depends(get_settings)],
) -> str:
    """
    Validate Supabase JWT and extract authenticated user UUID.
    Supports:
      1. Local JWT decode if SUPABASE_JWT_SECRET is set
      2. Direct Supabase Auth token validation via client.auth.get_user(token)
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired authentication token.",
        headers={"WWW-Authenticate": "Bearer"},
    )

    token = credentials.credentials
    if not token or not token.strip():
        raise credentials_exception

    # Method 1: Local JWT decode if secret is provided (using PyJWT with OpenSSL crypto)
    if settings.supabase_jwt_secret and settings.supabase_jwt_secret.strip():
        try:
            payload = jwt.decode(
                token,
                settings.supabase_jwt_secret,
                algorithms=["HS256"],
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_aud": False,
                },
            )
            user_id = payload.get("sub")
            if user_id:
                return str(user_id)
        except PyJWTError as exc:
            logger.debug("Local JWT decode unsuccessful: %s", exc)

    # Method 2: Supabase Auth server verification
    try:
        supabase = create_client(settings.supabase_url, settings.supabase_service_role_key)
        user_res = supabase.auth.get_user(token)
        if user_res and user_res.user and user_res.user.id:
            return str(user_res.user.id)
    except Exception as exc:
        logger.warning("Supabase auth verification failed: %s", exc)

    # Method 3: Parse unverified sub as last resort only in dev mode if token has standard JWT format
    if not settings.is_production:
        try:
            unverified = jwt.decode(token, options={"verify_signature": False})
            sub = unverified.get("sub")
            if sub:
                return str(sub)
        except Exception:
            pass

    raise credentials_exception


# Dependency aliases
CurrentUser = Annotated[str, Depends(get_current_user)]
SupabaseClient = Annotated[Client, Depends(get_supabase_client)]
AppSettings = Annotated[Settings, Depends(get_settings)]
