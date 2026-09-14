"""
routers/resumes.py — Screen 2: Resume Upload API router.
Supports strictly PDF and DOCX formats up to 10MB per file.
"""
from typing import List, Dict, Any
from fastapi import APIRouter, File, UploadFile, status
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import ResumeUploadResponse
from ..services.screen_services import ResumeJobService

router = APIRouter(prefix="/api/resumes", tags=["Screen 2: Resume Upload"])


@router.post("/upload", response_model=ResumeUploadResponse, status_code=status.HTTP_201_CREATED)
async def upload_resume(
    current_user: CurrentUser,
    supabase: SupabaseClient,
    file: UploadFile = File(...),
):
    """
    Upload a resume file (PDF or DOCX only, max 10MB).
    Extracts text and persists record scoped to the authenticated recruiter.
    """
    content = await file.read()
    return ResumeJobService.upload_resume(supabase, current_user, file, content)


@router.get("", response_model=List[Dict[str, Any]])
async def list_resumes(
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """List all uploaded resumes belonging to the authenticated recruiter."""
    return ResumeJobService.list_resumes(supabase, current_user)
