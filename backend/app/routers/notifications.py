"""notifications.py — GET/PATCH /api/settings/notifications"""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import NotificationPrefsUpdate, NotificationPrefsResponse

router = APIRouter(prefix="/api/settings/notifications", tags=["notifications"])

_DEFAULTS = {
    "email_notifications": True, "new_resume_alert": True,
    "analysis_completed_alert": True, "duplicate_resume_alert": True,
    "assessment_assigned_alert": True, "assessment_completed_alert": True,
    "shortlisted_alert": True, "rejection_alert": False,
    "weekly_summary": True, "system_security_alerts": True,
    "in_app_notifications": True, "reminder_enabled": True,
    "reminder_hours_before": 24, "reminder_frequency": "once",
}


@router.get("", response_model=NotificationPrefsResponse)
async def get_notifications(user_id: CurrentUser, sb: SupabaseClient):
    try:
        result = sb.from_("notification_preferences").select("*").eq("user_id", user_id).maybe_single().execute()
        if result and result.data:
            return NotificationPrefsResponse(**result.data)
        created = sb.from_("notification_preferences").insert({"user_id": user_id, **_DEFAULTS}).select().single().execute()
        if created and created.data:
            return NotificationPrefsResponse(**created.data)
    except Exception:
        pass
    return NotificationPrefsResponse(id=f"notif-{user_id[:8]}", user_id=user_id, **_DEFAULTS)


@router.patch("", response_model=NotificationPrefsResponse)
async def update_notifications(body: NotificationPrefsUpdate, user_id: CurrentUser, sb: SupabaseClient):
    update = body.model_dump(exclude_none=True)
    try:
        result = sb.from_("notification_preferences").upsert({"user_id": user_id, **update}).select().single().execute()
        if result and result.data:
            return NotificationPrefsResponse(**result.data)
    except Exception:
        pass
    merged = {**_DEFAULTS, **update}
    return NotificationPrefsResponse(id=f"notif-{user_id[:8]}", user_id=user_id, **merged)
