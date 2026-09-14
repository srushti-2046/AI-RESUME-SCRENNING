"""
routers/candidates.py — Screen 3: Candidates API router.
Serves candidate directory, search, status filtering, and counts.
NOTE: Manual status override endpoint is strictly prohibited per locked screening rules.
"""
from typing import List
from fastapi import APIRouter, Query
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import CandidateListItemResponse, CandidateCountsResponse, CandidateDetailResponse
from ..services.screen_services import CandidateService

router = APIRouter(prefix="/api/candidates", tags=["Screen 3: Candidates"])


@router.get("", response_model=List[CandidateListItemResponse])
async def get_candidates(
    current_user: CurrentUser,
    supabase: SupabaseClient,
    status: str = Query("all", pattern="^(all|shortlisted|rejected)$"),
    search: str = Query("", max_length=100),
):
    """
    List classified candidates for the authenticated recruiter.
    Strictly displays classified records (All = Shortlisted + Rejected).
    """
    return CandidateService.get_candidates(supabase, current_user, status_filter=status, search=search)


@router.get("/counts", response_model=CandidateCountsResponse)
async def get_candidate_counts(
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Retrieve exact counts for candidates (all = shortlisted + rejected)."""
    return CandidateService.get_counts(supabase, current_user)


@router.get("/{candidate_id}", response_model=CandidateDetailResponse)
async def get_candidate_detail(
    candidate_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Retrieve complete candidate profile, skills, and activities with recruiter ownership verification."""
    return CandidateService.get_candidate_detail(supabase, current_user, candidate_id)
