"""
routers/ats.py — Screen 6: ATS Compatibility API router.
Computes and retrieves authoritative ATS reports with ats_v1 versioning.
NOTE: ATS checks strictly have zero side effects on match score or candidate status.
"""
from typing import Optional
from fastapi import APIRouter, Query
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import ATSCheckRequest, ATSReportResponse
from ..services.screen_services import ATSService

router = APIRouter(prefix="/api/ats", tags=["Screen 6: ATS Compatibility"])


@router.post("/check", response_model=ATSReportResponse)
async def check_ats(
    payload: ATSCheckRequest,
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """
    Run authoritative ATS compatibility check on resume.
    Evaluates formatting, headers, and keyword coverage.
    Has zero side effects on candidate screening match score or status.
    """
    return ATSService.check_ats(supabase, current_user, payload.resume_id, payload.job_id)


@router.get("/report/{resume_id}", response_model=ATSReportResponse)
async def get_ats_report(
    resume_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
    job_id: Optional[str] = Query(None),
):
    """Fetch cached authoritative ATS report (ats_v1)."""
    return ATSService.check_ats(supabase, current_user, resume_id, job_id)
