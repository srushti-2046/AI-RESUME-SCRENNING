"""
settings_schemas.py — Pydantic v2 request/response schemas for all settings endpoints.
All input is validated before reaching the database.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator


# ─────────────────────────────────────────────────
# PROFILE
# ─────────────────────────────────────────────────
class ProfileUpdateRequest(BaseModel):
    full_name: str = Field(..., min_length=1, max_length=120)
    phone: Optional[str] = Field(None, max_length=30)
    company: Optional[str] = Field(None, max_length=120)
    department: Optional[str] = Field(None, max_length=120)
    timezone: Optional[str] = Field(None, max_length=60)
    bio: Optional[str] = Field(None, max_length=500)


class ProfileResponse(BaseModel):
    id: str
    full_name: Optional[str]
    email: Optional[str]
    role: Optional[str]
    avatar_url: Optional[str]
    created_at: Optional[datetime]
    updated_at: Optional[datetime]


# ─────────────────────────────────────────────────
# USER SETTINGS
# ─────────────────────────────────────────────────
class UserSettingsUpdate(BaseModel):
    theme: Optional[str] = Field(None, pattern="^(light|dark|system)$")
    language: Optional[str] = Field(None, max_length=10)
    timezone: Optional[str] = Field(None, max_length=60)


class UserSettingsResponse(BaseModel):
    theme: str
    language: str
    timezone: str


# ─────────────────────────────────────────────────
# NOTIFICATIONS
# ─────────────────────────────────────────────────
class NotificationPrefsUpdate(BaseModel):
    email_notifications: Optional[bool] = None
    new_resume_alert: Optional[bool] = None
    analysis_completed_alert: Optional[bool] = None
    duplicate_resume_alert: Optional[bool] = None
    assessment_assigned_alert: Optional[bool] = None
    assessment_completed_alert: Optional[bool] = None
    shortlisted_alert: Optional[bool] = None
    rejection_alert: Optional[bool] = None
    weekly_summary: Optional[bool] = None
    system_security_alerts: Optional[bool] = None
    in_app_notifications: Optional[bool] = None
    reminder_enabled: Optional[bool] = None
    reminder_hours_before: Optional[int] = Field(None, ge=1, le=72)
    reminder_frequency: Optional[str] = Field(None, pattern="^(once|daily|weekly)$")


class NotificationPrefsResponse(BaseModel):
    email_notifications: bool
    new_resume_alert: bool
    analysis_completed_alert: bool
    duplicate_resume_alert: bool
    assessment_assigned_alert: bool
    assessment_completed_alert: bool
    shortlisted_alert: bool
    rejection_alert: bool
    weekly_summary: bool
    system_security_alerts: bool
    in_app_notifications: bool
    reminder_enabled: bool
    reminder_hours_before: int
    reminder_frequency: str


# ─────────────────────────────────────────────────
# PRIVACY
# ─────────────────────────────────────────────────
class PrivacySettingsUpdate(BaseModel):
    profile_visibility: Optional[str] = Field(None, pattern="^(private|recruiters_only|public)$")
    resume_visibility: Optional[str] = Field(None, pattern="^(private|recruiters_only)$")
    analytics_enabled: Optional[bool] = None
    personalization_enabled: Optional[bool] = None
    activity_tracking_enabled: Optional[bool] = None


class PrivacySettingsResponse(BaseModel):
    profile_visibility: str
    resume_visibility: str
    analytics_enabled: bool
    personalization_enabled: bool
    activity_tracking_enabled: bool


# ─────────────────────────────────────────────────
# ACCOUNT
# ─────────────────────────────────────────────────
class AccountResponse(BaseModel):
    id: str
    email: Optional[str]
    full_name: Optional[str]
    role: Optional[str]
    created_at: Optional[datetime]
    last_sign_in_at: Optional[datetime]


class DeleteAccountRequest(BaseModel):
    confirmation: str = Field(..., description="Must be exactly 'DELETE MY ACCOUNT'")

    @field_validator("confirmation")
    @classmethod
    def must_confirm(cls, v: str) -> str:
        if v.strip() != "DELETE MY ACCOUNT":
            raise ValueError("Confirmation text must be exactly: DELETE MY ACCOUNT")
        return v


# ─────────────────────────────────────────────────
# SCREENING PREFERENCES
# ─────────────────────────────────────────────────
class ScreeningPrefsUpdate(BaseModel):
    minimum_resume_score: Optional[int] = Field(None, ge=0, le=100)
    minimum_match_score: Optional[int] = Field(None, ge=0, le=100)
    minimum_experience_years: Optional[int] = Field(None, ge=0, le=50)
    required_education: Optional[str] = Field(
        None, pattern="^(any|high_school|associate|bachelor|master|phd)$"
    )
    mandatory_skills: Optional[list[str]] = Field(None, max_length=50)
    optional_skills: Optional[list[str]] = Field(None, max_length=50)
    minimum_ats_score: Optional[int] = Field(None, ge=0, le=100)


class ScreeningPrefsResponse(BaseModel):
    minimum_resume_score: int
    minimum_match_score: int
    minimum_experience_years: int
    required_education: str
    mandatory_skills: list[str]
    optional_skills: list[str]
    minimum_ats_score: int
    note: str = (
        "These are preferences for filtering only. "
        "The automated screening rule (match_score >= 60 → shortlisted) is unchanged."
    )


# ─────────────────────────────────────────────────
# TEAM
# ─────────────────────────────────────────────────
class TeamInviteRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = Field(None, max_length=120)
    role: str = Field("recruiter", pattern="^(admin|recruiter|hiring_manager|viewer)$")


class TeamMemberUpdate(BaseModel):
    role: Optional[str] = Field(None, pattern="^(admin|recruiter|hiring_manager|viewer)$")
    status: Optional[str] = Field(None, pattern="^(active|inactive|removed)$")


class TeamMemberResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    role: str
    status: str
    invited_at: Optional[datetime]
    joined_at: Optional[datetime]


# ─────────────────────────────────────────────────
# EMAIL PREFERENCES & TEMPLATES
# ─────────────────────────────────────────────────
class EmailPrefsUpdate(BaseModel):
    application_received: Optional[bool] = None
    analysis_completed: Optional[bool] = None
    assessment_invitation: Optional[bool] = None
    assessment_reminder: Optional[bool] = None
    assessment_completed: Optional[bool] = None
    shortlisted_notification: Optional[bool] = None
    rejection_notification: Optional[bool] = None
    new_resume: Optional[bool] = None


class EmailPrefsResponse(BaseModel):
    application_received: bool
    analysis_completed: bool
    assessment_invitation: bool
    assessment_reminder: bool
    assessment_completed: bool
    shortlisted_notification: bool
    rejection_notification: bool
    new_resume: bool


class EmailTemplateUpdate(BaseModel):
    event_type: str = Field(
        ...,
        pattern="^(application_received|new_resume|analysis_completed|shortlisted|rejected|assessment_assigned|assessment_completed)$",
    )
    subject: str = Field(..., min_length=1, max_length=200)
    body: str = Field(..., min_length=1, max_length=5000)
    is_active: Optional[bool] = True


class EmailTemplateResponse(BaseModel):
    event_type: str
    subject: str
    body: str
    is_active: bool


# ─────────────────────────────────────────────────
# INTEGRATIONS
# ─────────────────────────────────────────────────
class IntegrationStatusItem(BaseModel):
    name: str
    status: str  # "connected" | "configured" | "not_connected" | "not_configured"
    description: str


class IntegrationsResponse(BaseModel):
    integrations: list[IntegrationStatusItem]


class IntegrationUpdate(BaseModel):
    email_service_enabled: Optional[bool] = None
    slack_enabled: Optional[bool] = None
    teams_enabled: Optional[bool] = None
    slack_webhook_url: Optional[str] = Field(None, max_length=500)
    teams_webhook_url: Optional[str] = Field(None, max_length=500)
    notification_channel: Optional[str] = Field(None, max_length=120)


# ─────────────────────────────────────────────────
# DATA RETENTION
# ─────────────────────────────────────────────────
class DataRetentionUpdate(BaseModel):
    resume_retention_days: Optional[int] = Field(None, ge=30, le=3650)
    candidate_retention_days: Optional[int] = Field(None, ge=30, le=3650)
    assessment_retention_days: Optional[int] = Field(None, ge=30, le=3650)
    auto_delete_enabled: Optional[bool] = None


class DataRetentionResponse(BaseModel):
    resume_retention_days: int
    candidate_retention_days: int
    assessment_retention_days: int
    auto_delete_enabled: bool
    note: str = (
        "auto_delete_enabled does not immediately delete data. "
        "A separate backend job handles controlled cleanup based on these settings."
    )


# ─────────────────────────────────────────────────
# SUPPORT TICKETS
# ─────────────────────────────────────────────────
VALID_TICKET_CATEGORIES = [
    "resume_upload", "analysis", "ranking", "ats", "duplicate",
    "assessment", "account_security", "notifications", "billing", "other"
]


class SupportTicketCreate(BaseModel):
    category: str = Field(..., pattern="^(resume_upload|analysis|ranking|ats|duplicate|assessment|account_security|notifications|billing|other)$")
    subject: str = Field(..., min_length=3, max_length=200)
    description: str = Field(..., min_length=10, max_length=5000)


class SupportTicketResponse(BaseModel):
    id: str
    user_id: Optional[str] = None
    category: str
    subject: str
    description: str
    status: str
    admin_reply: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ─────────────────────────────────────────────────
# ABOUT / FAQ / GUIDES
# ─────────────────────────────────────────────────
class AboutResponse(BaseModel):
    app_name: str
    version: str
    environment: str
    description: str
    copyright: str


class FAQItem(BaseModel):
    question: str
    answer: str
    category: str


class GuideItem(BaseModel):
    title: str
    description: str
    steps: list[str]


# ─────────────────────────────────────────────────
# GENERIC RESPONSES
# ─────────────────────────────────────────────────
class MessageResponse(BaseModel):
    message: str
    success: bool = True
