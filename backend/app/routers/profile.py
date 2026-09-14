"""
profile.py — Screen 10: Profile Router.
Provides authenticated access to personal profile and dynamic recruiting overview.
"""
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, UploadFile, File, status
from supabase import Client

from ..dependencies import get_current_user, get_supabase_client
from ..schemas.profile_schemas import (
    ProfileResponse,
    ProfileUpdateRequest,
    AvatarUploadResponse
)
from ..services.profile_service import ProfileService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/profile", tags=["Screen 10: Profile"])


@router.get("", response_model=ProfileResponse, summary="Get Current Recruiter Profile")
async def get_profile(
    current_user_id: Annotated[str, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
) -> ProfileResponse:
    """
    Retrieve authenticated recruiter's profile and dynamic recruiting overview.
    Strictly scoped to the verified JWT subject (auth.uid()).
    """
    return ProfileService.get_profile(supabase, current_user_id)


@router.put("", response_model=ProfileResponse, summary="Update Recruiter Profile")
async def update_profile(
    req: ProfileUpdateRequest,
    current_user_id: Annotated[str, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
) -> ProfileResponse:
    """
    Update personal details (full_name, phone, company, department, timezone, bio, avatar_url).
    User ID, role, and email are strictly protected and cannot be modified.
    """
    return ProfileService.update_profile(supabase, current_user_id, req)


@router.post("/avatar", response_model=AvatarUploadResponse, summary="Upload Profile Avatar")
async def upload_avatar(
    current_user_id: Annotated[str, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)],
    file: UploadFile = File(...)
) -> AvatarUploadResponse:
    """
    Upload recruiter avatar (PNG, JPG, WebP, GIF, max 5 MB).
    Saves image to Supabase Storage avatars bucket and persists URL in public.profiles.
    """
    return await ProfileService.upload_avatar(supabase, current_user_id, file)


@router.delete("/avatar", summary="Remove Profile Avatar")
async def delete_avatar(
    current_user_id: Annotated[str, Depends(get_current_user)],
    supabase: Annotated[Client, Depends(get_supabase_client)]
):
    """
    Remove profile avatar and reset avatar_url to null.
    """
    return ProfileService.delete_avatar(supabase, current_user_id)
