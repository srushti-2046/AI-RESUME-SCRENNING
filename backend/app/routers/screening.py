"""
screening.py — Recruiter screening preferences.
CRITICAL: These preferences do NOT alter the automated screening rule.
The rule match_score >= 60 → shortlisted remains locked in the database trigger.
"""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import ScreeningPrefsUpdate, ScreeningPrefsResponse

router = APIRouter(prefix="/api/settings/screening", tags=["screening"])

_DEFAULTS = {
    "minimum_resume_score": 60,
    "minimum_match_score": 60,
    "minimum_experience_years": 0,
    "required_education": "any",
    "mandatory_skills": [],
    "optional_skills": [],
    "minimum_ats_score": 60,
}


@router.get("", response_model=ScreeningPrefsResponse)
async def get_screening_prefs(user_id: CurrentUser, sb: SupabaseClient):
    try:
        result = sb.from_("recruiter_screening_preferences").select("*").eq("recruiter_id", user_id).maybe_single().execute()
        if result and result.data:
            return ScreeningPrefsResponse(**result.data)
        created = sb.from_("recruiter_screening_preferences").insert({"recruiter_id": user_id, **_DEFAULTS}).select().single().execute()
        if created and created.data:
            return ScreeningPrefsResponse(**created.data)
    except Exception:
        pass
    return ScreeningPrefsResponse(id=f"pref-{user_id[:8]}", recruiter_id=user_id, **_DEFAULTS)


@router.patch("", response_model=ScreeningPrefsResponse)
async def update_screening_prefs(body: ScreeningPrefsUpdate, user_id: CurrentUser, sb: SupabaseClient):
    """
    Updates recruiter's screening preferences.
    These are stored in recruiter_screening_preferences and used for UI filtering only.
    They do NOT modify: candidates.match_score, candidates.status, resumes.resume_score, or ranking.
    """
    update = body.model_dump(exclude_none=True)
    try:
        result = sb.from_("recruiter_screening_preferences").upsert({"recruiter_id": user_id, **update}).select().single().execute()
        if result and result.data:
            return ScreeningPrefsResponse(**result.data)
    except Exception:
        pass
    merged = {**_DEFAULTS, **update}
    return ScreeningPrefsResponse(id=f"pref-{user_id[:8]}", recruiter_id=user_id, **merged)
