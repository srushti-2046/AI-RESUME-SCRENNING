"""email_prefs.py — Email automation preferences + templates."""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import (
    EmailPrefsUpdate, EmailPrefsResponse,
    EmailTemplateUpdate, EmailTemplateResponse,
)

router = APIRouter(prefix="/api/settings/email", tags=["email"])

_EMAIL_DEFAULTS = {
    "application_received": True, "analysis_completed": True,
    "assessment_invitation": True, "assessment_reminder": True,
    "assessment_completed": True, "shortlisted_notification": True,
    "rejection_notification": False, "new_resume": True,
}

_TEMPLATE_DEFAULTS = {
    "application_received": {
        "subject": "We received your application — {{company_name}}",
        "body": "Hi {{candidate_name}},\n\nThank you for applying. We have received your application and will review it shortly.\n\nBest regards,\n{{recruiter_name}}\n{{company_name}}",
    },
    "new_resume": {
        "subject": "New resume uploaded — {{company_name}}",
        "body": "Hi {{candidate_name}},\n\nYour resume has been uploaded successfully. Our team will review it soon.\n\nBest,\n{{recruiter_name}}",
    },
    "analysis_completed": {
        "subject": "Resume analysis complete — {{company_name}}",
        "body": "Hi {{candidate_name}},\n\nWe have completed the AI analysis of your resume. You will hear from us soon.\n\nBest,\n{{recruiter_name}}",
    },
    "shortlisted": {
        "subject": "Congratulations — You've been shortlisted! — {{company_name}}",
        "body": "Hi {{candidate_name}},\n\nWe are pleased to inform you that you have been shortlisted for the next stage of our hiring process.\n\nBest regards,\n{{recruiter_name}}\n{{company_name}}",
    },
    "rejected": {
        "subject": "Application Update — {{company_name}}",
        "body": "Hi {{candidate_name}},\n\nThank you for your interest. After careful review, we will not be moving forward with your application at this time.\n\nWe wish you the best in your search.\n\n{{recruiter_name}}\n{{company_name}}",
    },
    "assessment_assigned": {
        "subject": "Assessment Invitation — {{assessment_name}} — {{company_name}}",
        "body": "Hi {{candidate_name}},\n\nYou have been invited to complete the following assessment:\n\n{{assessment_name}}\n\nLink: {{assessment_link}}\n\nBest of luck!\n\n{{recruiter_name}}\n{{company_name}}",
    },
    "assessment_completed": {
        "subject": "Assessment Received — {{company_name}}",
        "body": "Hi {{candidate_name}},\n\nWe have received your completed assessment for {{assessment_name}}. We will review it and be in touch soon.\n\nBest,\n{{recruiter_name}}",
    },
}


@router.get("", response_model=EmailPrefsResponse)
async def get_email_prefs(user_id: CurrentUser, sb: SupabaseClient):
    result = sb.from_("email_preferences").select("*").eq("recruiter_id", user_id).maybe_single().execute()
    if not result.data:
        created = sb.from_("email_preferences").insert({"recruiter_id": user_id, **_EMAIL_DEFAULTS}).select().single().execute()
        return EmailPrefsResponse(**created.data)
    return EmailPrefsResponse(**result.data)


@router.patch("", response_model=EmailPrefsResponse)
async def update_email_prefs(body: EmailPrefsUpdate, user_id: CurrentUser, sb: SupabaseClient):
    update = body.model_dump(exclude_none=True)
    result = sb.from_("email_preferences").upsert({"recruiter_id": user_id, **update}).select().single().execute()
    return EmailPrefsResponse(**result.data)


@router.get("/templates", response_model=list[EmailTemplateResponse])
async def get_templates(user_id: CurrentUser, sb: SupabaseClient):
    result = sb.from_("email_templates").select("*").eq("recruiter_id", user_id).execute()
    if not result.data:
        # Seed defaults
        inserts = [{"recruiter_id": user_id, "event_type": et, "subject": d["subject"], "body": d["body"]} for et, d in _TEMPLATE_DEFAULTS.items()]
        created = sb.from_("email_templates").insert(inserts).select().execute()
        return [EmailTemplateResponse(**t) for t in (created.data or [])]
    return [EmailTemplateResponse(**t) for t in result.data]


@router.patch("/templates", response_model=EmailTemplateResponse)
async def update_template(body: EmailTemplateUpdate, user_id: CurrentUser, sb: SupabaseClient):
    result = sb.from_("email_templates").upsert({
        "recruiter_id": user_id, "event_type": body.event_type,
        "subject": body.subject, "body": body.body, "is_active": body.is_active,
    }).select().single().execute()
    return EmailTemplateResponse(**result.data)
