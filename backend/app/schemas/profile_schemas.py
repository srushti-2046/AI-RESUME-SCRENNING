from typing import Optional
from pydantic import BaseModel, Field

class RecruitingOverview(BaseModel):
    total_screened: int = 0
    shortlisted: int = 0
    rejected: int = 0
    resumes_uploaded: int = 0
    jobs_created: int = 0

class ProfileResponse(BaseModel):
    id: str
    email: str
    full_name: str
    role: str = "recruiter"
    avatar_url: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    department: Optional[str] = None
    timezone: Optional[str] = None
    bio: Optional[str] = None
    account_status: str = "Active Recruiter"
    security_status: str = "Protected (2FA Ready)"
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    recruiting_overview: RecruitingOverview = Field(default_factory=RecruitingOverview)

class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    company: Optional[str] = None
    department: Optional[str] = None
    timezone: Optional[str] = None
    bio: Optional[str] = None
    avatar_url: Optional[str] = None

class AvatarUploadResponse(BaseModel):
    avatar_url: str
    message: str = "Avatar uploaded successfully"
