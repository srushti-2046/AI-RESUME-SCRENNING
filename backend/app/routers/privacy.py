"""privacy.py — GET/PATCH /api/settings/privacy"""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import PrivacySettingsUpdate, PrivacySettingsResponse

router = APIRouter(prefix="/api/settings/privacy", tags=["privacy"])

_DEFAULTS = {
    "profile_visibility": "private",
    "resume_visibility": "private",
    "analytics_enabled": True,
    "personalization_enabled": True,
    "activity_tracking_enabled": True,
}


@router.get("", response_model=PrivacySettingsResponse)
async def get_privacy(user_id: CurrentUser, sb: SupabaseClient):
    try:
        result = sb.from_("privacy_settings").select("*").eq("user_id", user_id).maybe_single().execute()
        if result and result.data:
            return PrivacySettingsResponse(**result.data)
        created = sb.from_("privacy_settings").insert({"user_id": user_id, **_DEFAULTS}).select().single().execute()
        if created and created.data:
            return PrivacySettingsResponse(**created.data)
    except Exception:
        pass
    return PrivacySettingsResponse(id=f"priv-{user_id[:8]}", user_id=user_id, **_DEFAULTS)


@router.patch("", response_model=PrivacySettingsResponse)
async def update_privacy(body: PrivacySettingsUpdate, user_id: CurrentUser, sb: SupabaseClient):
    update = body.model_dump(exclude_none=True)
    try:
        result = sb.from_("privacy_settings").upsert({"user_id": user_id, **update}).select().single().execute()
        if result and result.data:
            return PrivacySettingsResponse(**result.data)
    except Exception:
        pass
    merged = {**_DEFAULTS, **update}
    return PrivacySettingsResponse(id=f"priv-{user_id[:8]}", user_id=user_id, **merged)
