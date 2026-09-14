"""
routers/assessments.py — Screen 8: Assessment Builder & Evaluation API router.
Manages assessments, questions, module weighting, and test attempts.
NOTE: Public assessment projection strictly omits answers and explanations.
NOTE: Assessment submissions strictly have zero side effects on screening match scores or candidate status.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, status
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import (
    AssessmentCreateRequest, AssessmentResponse, PublicAssessmentResponse,
    AssessmentSubmissionRequest, AssessmentAttemptResponse
)
from ..services.screen_services import AssessmentService

router = APIRouter(prefix="/api/assessments", tags=["Screen 8: Assessment Builder"])


@router.get("/modules", response_model=List[Dict[str, Any]])
async def list_modules(
    supabase: SupabaseClient,
):
    """List available skill assessment modules (Python, SQL, Algorithms, etc.)."""
    return AssessmentService.list_modules(supabase)


@router.post("", response_model=AssessmentResponse, status_code=status.HTTP_201_CREATED)
async def create_assessment(
    payload: AssessmentCreateRequest,
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """
    Create custom assessment with module weights totaling exactly 100%.
    Generates a secure 48-character share token.
    """
    return AssessmentService.create_assessment(supabase, current_user, payload)


@router.get("", response_model=List[AssessmentResponse])
async def list_assessments(
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """List all assessments created by the authenticated recruiter."""
    return AssessmentService.list_assessments(supabase, current_user)


@router.get("/public/{share_token}", response_model=PublicAssessmentResponse)
async def get_public_assessment(
    share_token: str,
    supabase: SupabaseClient,
):
    """
    Candidate assessment view.
    Strictly projects questions without leaking correct_answer or explanation.
    """
    return AssessmentService.get_public_assessment(supabase, share_token)


@router.post("/public/{share_token}/submit", response_model=AssessmentAttemptResponse)
async def submit_assessment(
    share_token: str,
    payload: AssessmentSubmissionRequest,
    supabase: SupabaseClient,
):
    """
    Submit candidate answers for server-side evaluation.
    Computes score and records attempt with zero side effects on candidate screening scores.
    """
    return AssessmentService.submit_assessment(supabase, share_token, payload)
