"""
settings.py — Main profile + user_settings router.
GET/PATCH /api/settings
GET/PATCH /api/settings/profile
"""
from fastapi import APIRouter, HTTPException
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import (
    ProfileUpdateRequest, ProfileResponse,
    UserSettingsUpdate, UserSettingsResponse,
)

router = APIRouter(prefix="/api/settings", tags=["settings"])


@router.get("", summary="Get full settings overview")
async def get_settings_overview(
    user_id: CurrentUser,
    sb: SupabaseClient,
) -> dict:
    """Returns profile + user settings in one call for the settings page load."""
    profile = sb.from_("profiles").select("*").eq("id", user_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return {"profile": profile.data}


@router.get("/profile", response_model=ProfileResponse, summary="Get profile")
async def get_profile(user_id: CurrentUser, sb: SupabaseClient) -> ProfileResponse:
    result = sb.from_("profiles").select("*").eq("id", user_id).single().execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**result.data)


@router.patch("/profile", response_model=ProfileResponse, summary="Update profile")
async def update_profile(
    body: ProfileUpdateRequest,
    user_id: CurrentUser,
    sb: SupabaseClient,
) -> ProfileResponse:
    """Update authenticated user's own profile only."""
    update_data = body.model_dump(exclude_none=True)
    update_data["updated_at"] = "now()"

    result = (
        sb.from_("profiles")
        .update(update_data)
        .eq("id", user_id)
        .select()
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**result.data)


@router.get("/user-settings", response_model=UserSettingsResponse, summary="Get user settings")
async def get_user_settings(user_id: CurrentUser, sb: SupabaseClient) -> UserSettingsResponse:
    result = sb.from_("user_settings").select("*").eq("user_id", user_id).maybe_single().execute()
    if not result.data:
        # Auto-create defaults
        created = (
            sb.from_("user_settings")
            .insert({"user_id": user_id})
            .select()
            .single()
            .execute()
        )
        return UserSettingsResponse(**created.data)
    return UserSettingsResponse(**result.data)


@router.patch("/user-settings", response_model=UserSettingsResponse)
async def update_user_settings(
    body: UserSettingsUpdate,
    user_id: CurrentUser,
    sb: SupabaseClient,
) -> UserSettingsResponse:
    update = body.model_dump(exclude_none=True)
    result = (
        sb.from_("user_settings")
        .upsert({"user_id": user_id, **update})
        .select()
        .single()
        .execute()
    )
    return UserSettingsResponse(**result.data)
