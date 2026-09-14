"""
screen_schemas.py — Pydantic models for Screens 1 through 8.
Strictly defines type-safe requests and responses.
"""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# =============================================================================
# SCREEN 1: DASHBOARD
# =============================================================================
class DashboardStatsResponse(BaseModel):
    total_candidates: int = 0
    shortlisted_candidates: int = 0
    rejected_candidates: int = 0
    interview_ready: int = 0
    average_score: float = 0.0


class RecentActivityItem(BaseModel):
    id: str
    activity_type: str
    activity_message: Optional[str] = None
    created_at: Optional[datetime] = None
    candidate_name: Optional[str] = None


class WeeklyTrendItem(BaseModel):
    day: str
    count: int


class DashboardOverviewResponse(BaseModel):
    stats: DashboardStatsResponse
    recent_activities: List[RecentActivityItem] = Field(default_factory=list)
    weekly_trends: List[WeeklyTrendItem] = Field(default_factory=list)
    active_jobs_count: int = 0


# =============================================================================
# SCREEN 2: RESUME UPLOAD & JOBS
# =============================================================================
class JobCreateRequest(BaseModel):
    title: str = Field(..., min_length=2, max_length=200)
    department: Optional[str] = Field(None, max_length=100)
    description: Optional[str] = Field(None, max_length=10000)
    required_skills: List[str] = Field(default_factory=list, max_length=50)
    optional_skills: List[str] = Field(default_factory=list, max_length=50)
    min_experience_years: Optional[float] = Field(0.0, ge=0.0, le=50.0)


class JobResponse(BaseModel):
    id: str
    title: str
    department: Optional[str] = None
    description: Optional[str] = None
    status: str = "active"
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    required_skills: List[str] = Field(default_factory=list)
    candidates_count: int = 0


class ResumeUploadResponse(BaseModel):
    id: str
    file_name: str
    file_type: str
    file_size: int
    extracted_text_preview: str
    processing_status: str = "uploaded"
    uploaded_at: Optional[datetime] = None


# =============================================================================
# SCREEN 3: CANDIDATES
# =============================================================================
class CandidateCountsResponse(BaseModel):
    all: int = 0
    shortlisted: int = 0
    rejected: int = 0


class CandidateListItemResponse(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    current_job_title: Optional[str] = None
    total_experience: float = 0.0
    education: Optional[str] = None
    status: str  # 'shortlisted' or 'rejected'
    match_score: float = 0.0
    resume_score: float = 0.0
    created_at: Optional[datetime] = None
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    resume_id: Optional[str] = None
    skills: List[str] = Field(default_factory=list)


class CandidateDetailResponse(BaseModel):
    id: str
    full_name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    current_job_title: Optional[str] = None
    total_experience: float = 0.0
    education: Optional[str] = None
    status: str
    match_score: float = 0.0
    resume_score: float = 0.0
    created_at: Optional[datetime] = None
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    resume_id: Optional[str] = None
    resume_file_name: Optional[str] = None
    skills: List[str] = Field(default_factory=list)
    activities: List[Dict[str, Any]] = Field(default_factory=list)
    score_breakdown: Optional[Dict[str, Any]] = None


# =============================================================================
# SCREEN 4: ANALYSIS RESULT
# =============================================================================
class AnalyzeResumesRequest(BaseModel):
    job_id: str = Field(..., min_length=1, max_length=100)
    resume_ids: List[str] = Field(..., min_length=1, max_length=100)


class SingleAnalysisResult(BaseModel):
    resume_id: str
    candidate_id: Optional[str] = None
    candidate_name: str
    file_name: str
    resume_score: float
    match_score: float
    status: str  # Strictly: match_score >= 60 -> 'shortlisted', < 60 -> 'rejected'
    skill_match_percentage: float
    matching_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    recommendation: str
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    score_breakdown: Dict[str, Any] = Field(default_factory=dict)


class AnalysisPipelineResponse(BaseModel):
    success: bool
    job_id: str
    total_processed: int
    success_count: int
    failed_count: int
    results: List[SingleAnalysisResult] = Field(default_factory=list)


# =============================================================================
# SCREEN 5: CANDIDATE RANKING
# =============================================================================
class RankedCandidateItem(BaseModel):
    rank: int
    candidate_id: str
    candidate_name: str
    match_score: float
    resume_score: float
    status: str
    percentile: float
    job_id: Optional[str] = None
    job_title: Optional[str] = None
    matching_skills: List[str] = Field(default_factory=list)


class RankingResponse(BaseModel):
    total_ranked: int
    candidates: List[RankedCandidateItem] = Field(default_factory=list)


# =============================================================================
# SCREEN 6: ATS COMPATIBILITY
# =============================================================================
class ATSCheckRequest(BaseModel):
    resume_id: str = Field(..., min_length=1, max_length=100)
    job_id: Optional[str] = Field(None, max_length=100)


class ATSCheckItem(BaseModel):
    id: Optional[str] = None
    check_type: str
    title: str
    status: str  # 'passed', 'warning', 'failed'
    score: float
    max_score: float
    description: str
    details: Optional[str] = None


class ATSReportResponse(BaseModel):
    id: str
    resume_id: str
    job_id: Optional[str] = None
    ats_score: float
    ats_status: str
    passed_count: int
    warning_count: int
    failed_count: int
    overall_summary: str
    recommendations: List[str] = Field(default_factory=list)
    checks: List[ATSCheckItem] = Field(default_factory=list)
    analysis_version: str = "ats_v1"


# =============================================================================
# SCREEN 7: DUPLICATE RESUME DETECTION
# =============================================================================
class DuplicatePairItem(BaseModel):
    id: str
    resume_a_id: str
    resume_b_id: str
    candidate_a_name: str
    candidate_b_name: str
    similarity_score: float
    duplicate_type: str
    matched_sections: List[str] = Field(default_factory=list)
    status: str = "unresolved"


class DuplicateOverviewResponse(BaseModel):
    scanned_count: int
    duplicate_pair_count: int
    duplicate_resume_count: int
    unique_resume_count: int
    pairs: List[DuplicatePairItem] = Field(default_factory=list)


class DuplicateCompareResponse(BaseModel):
    pair_id: str
    resume_a: Dict[str, Any]
    resume_b: Dict[str, Any]
    similarity_score: float
    duplicate_type: str
    shared_skills: List[str] = Field(default_factory=list)
    shared_work_experience: List[str] = Field(default_factory=list)


# =============================================================================
# SCREEN 8: ASSESSMENT
# =============================================================================
class ModuleWeightItem(BaseModel):
    module_id: str
    weight: float = Field(..., ge=0.0, le=100.0)


class AssessmentCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    duration_minutes: int = Field(30, ge=5, le=180)
    passing_score: float = Field(70.0, ge=1.0, le=100.0)
    module_weights: List[ModuleWeightItem] = Field(..., min_length=1)

    @field_validator("module_weights")
    @classmethod
    def validate_weights_total(cls, weights: List[ModuleWeightItem]) -> List[ModuleWeightItem]:
        total = round(sum(w.weight for w in weights), 2)
        if total != 100.0:
            raise ValueError(f"Module weights must total exactly 100%. Current sum: {total}%")
        return weights


class AssessmentResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    duration_minutes: int
    passing_score: float
    share_token: str
    status: str = "published"
    created_at: Optional[datetime] = None
    modules: List[Dict[str, Any]] = Field(default_factory=list)
    assignments_count: int = 0


class PublicQuestionItem(BaseModel):
    id: str
    question_text: str
    question_type: str
    options: List[str] = Field(default_factory=list)
    points: int = 1
    # Note: correct_answer and explanation are strictly OMITTED for candidate safety


class PublicAssessmentResponse(BaseModel):
    assessment_id: str
    title: str
    duration_minutes: int
    total_questions: int
    questions: List[PublicQuestionItem] = Field(default_factory=list)


class CandidateAnswerItem(BaseModel):
    question_id: str = Field(..., min_length=1, max_length=100)
    selected_option: str = Field(..., min_length=1, max_length=1000)


class AssessmentSubmissionRequest(BaseModel):
    candidate_name: str = Field(..., min_length=1, max_length=120)
    candidate_email: EmailStr
    answers: List[CandidateAnswerItem] = Field(..., min_length=1, max_length=100)


class AssessmentAttemptResponse(BaseModel):
    attempt_id: str
    assessment_id: str
    candidate_name: str
    score: float
    passed: bool
    total_questions: int
    correct_answers_count: int
    completed_at: Optional[datetime] = None
