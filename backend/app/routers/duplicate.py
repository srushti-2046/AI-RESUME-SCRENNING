"""
routers/duplicate.py — Screen 7: Duplicate Resume Detection API router.
Wraps authoritative duplicate detection PostgreSQL RPCs.
NOTE: Duplicate detection strictly has zero side effects on screening scores or candidate status.
"""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import DuplicateOverviewResponse, DuplicateCompareResponse
from ..services.screen_services import DuplicateService

router = APIRouter(prefix="/api/duplicate", tags=["Screen 7: Duplicate Detection"])


@router.get("/overview", response_model=DuplicateOverviewResponse)
async def get_duplicate_overview(
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Retrieve duplicate resume detection summary across all candidate resumes."""
    return DuplicateService.get_overview(supabase, current_user)


@router.post("/scan")
async def run_duplicate_scan(
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Trigger authoritative duplicate detection scan across all recruiter resumes."""
    return DuplicateService.scan_duplicates(supabase, current_user)


@router.get("/compare/{resume_a_id}/{resume_b_id}", response_model=DuplicateCompareResponse)
async def compare_resumes(
    resume_a_id: str,
    resume_b_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Side-by-side comparison of duplicate candidate resumes."""
    return DuplicateService.compare_resumes(supabase, current_user, resume_a_id, resume_b_id)
