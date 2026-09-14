"""retention.py — Data retention settings. Changing settings does NOT delete data."""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import DataRetentionUpdate, DataRetentionResponse

router = APIRouter(prefix="/api/settings/retention", tags=["retention"])

_DEFAULTS = {"resume_retention_days": 365, "candidate_retention_days": 365, "assessment_retention_days": 730, "auto_delete_enabled": False}


@router.get("", response_model=DataRetentionResponse)
async def get_retention(user_id: CurrentUser, sb: SupabaseClient):
    try:
        result = sb.from_("data_retention_settings").select("*").eq("user_id", user_id).maybe_single().execute()
        if result and result.data:
            return DataRetentionResponse(**result.data)
        created = sb.from_("data_retention_settings").insert({"user_id": user_id, **_DEFAULTS}).select().single().execute()
        if created and created.data:
            return DataRetentionResponse(**created.data)
    except Exception:
        pass
    return DataRetentionResponse(id=f"ret-{user_id[:8]}", user_id=user_id, **_DEFAULTS)


@router.patch("", response_model=DataRetentionResponse)
async def update_retention(body: DataRetentionUpdate, user_id: CurrentUser, sb: SupabaseClient):
    update = body.model_dump(exclude_none=True)
    try:
        result = sb.from_("data_retention_settings").upsert({"user_id": user_id, **update}).select().single().execute()
        if result and result.data:
            return DataRetentionResponse(**result.data)
    except Exception:
        pass
    merged = {**_DEFAULTS, **update}
    return DataRetentionResponse(id=f"ret-{user_id[:8]}", user_id=user_id, **merged)
