"""
routers/ranking.py — Screen 5: Candidate Ranking API router.
Returns ranked candidates leaderboard ordered by match score descending.
"""
from typing import Optional
from fastapi import APIRouter, Query
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import RankingResponse
from ..services.screen_services import RankingService

router = APIRouter(prefix="/api/ranking", tags=["Screen 5: Candidate Ranking"])


@router.get("", response_model=RankingResponse)
async def get_ranking(
    current_user: CurrentUser,
    supabase: SupabaseClient,
    job_id: Optional[str] = Query(None),
):
    """
    Retrieve ranked candidate leaderboard for the recruiter.
    Orders candidates by match_score DESC with percentile tiering.
    """
    return RankingService.get_ranking(supabase, current_user, job_id=job_id)
