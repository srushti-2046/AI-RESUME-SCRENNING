"""
routers/jobs.py — Screen 2: Job Requisitions API router.
Manages recruiter job descriptions and requirements.
"""
from typing import List
from fastapi import APIRouter, status
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import JobCreateRequest, JobResponse
from ..services.screen_services import ResumeJobService

router = APIRouter(prefix="/api/jobs", tags=["Screen 2: Job Requisitions"])


@router.post("", response_model=JobResponse, status_code=status.HTTP_201_CREATED)
async def create_job(
    payload: JobCreateRequest,
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Create a new job description for screening."""
    return ResumeJobService.create_job(supabase, current_user, payload)


@router.get("", response_model=List[JobResponse])
async def list_jobs(
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """List all active job requisitions owned by the authenticated recruiter."""
    return ResumeJobService.list_jobs(supabase, current_user)
