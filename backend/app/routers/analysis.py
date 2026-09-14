"""
routers/analysis.py — Screen 4: Analysis Result API router.
Consumes and persists authoritative screening results.
Enforces locked classification rule:
  match_score >= 60 -> Shortlisted
  match_score < 60  -> Rejected
"""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import AnalyzeResumesRequest, SingleAnalysisResult, AnalysisPipelineResponse
from ..services.screen_services import AnalysisService

router = APIRouter(prefix="/api/analysis", tags=["Screen 4: Analysis Result"])


@router.post("/analyze", response_model=AnalysisPipelineResponse)
async def analyze_resumes(
    payload: AnalyzeResumesRequest,
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """
    Run authoritative screening on resumes against target job.
    Applies the authoritative classification:
      match_score >= 60 -> shortlisted
      match_score < 60  -> rejected
    """
    return AnalysisService.analyze_resumes(supabase, current_user, payload)


@router.get("/result/{resume_id}", response_model=SingleAnalysisResult)
async def get_analysis_result(
    resume_id: str,
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Fetch authoritative candidate scorecard and skill match breakdown."""
    return AnalysisService.get_result(supabase, current_user, resume_id)
