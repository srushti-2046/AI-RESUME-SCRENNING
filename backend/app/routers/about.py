"""about.py — Static content: About, FAQ, Guides."""
from fastapi import APIRouter
from ..dependencies import CurrentUser, AppSettings
from ..schemas.settings_schemas import AboutResponse, FAQItem, GuideItem

router = APIRouter(prefix="/api/settings", tags=["about"])


@router.get("/about", response_model=AboutResponse)
async def get_about(user_id: CurrentUser, settings: AppSettings):
    return AboutResponse(
        app_name="AI Resume Screening",
        version=settings.app_version,
        environment=settings.environment.capitalize(),
        description="AI-powered recruitment platform for automated resume screening, candidate ranking, ATS compatibility checking, duplicate detection, and skills assessment.",
        copyright=f"© 2026 AI Resume Screening. All rights reserved.",
    )


@router.get("/faq", response_model=list[FAQItem])
async def get_faq(user_id: CurrentUser):
    return [
        FAQItem(category="Resume Upload", question="What file formats are supported for resume upload?", answer="We support PDF, DOCX, and TXT files up to 5MB per file. PDF is recommended for best parsing accuracy."),
        FAQItem(category="Resume Upload", question="Can I upload multiple resumes at once?", answer="Yes. You can select and upload multiple resume files simultaneously from the Upload screen."),
        FAQItem(category="Analysis", question="How does the AI Resume Match Score work?", answer="The AI analyzes the resume text and compares it against the job description using semantic similarity, keyword matching, experience, education, and skills. A score of 0–100 is assigned."),
        FAQItem(category="Analysis", question="Why was a candidate automatically shortlisted or rejected?", answer="Candidates with a match_score >= 60 are automatically shortlisted. Candidates below 60 are rejected. This threshold ensures consistent, unbiased screening."),
        FAQItem(category="ATS", question="How is ATS compatibility calculated?", answer="The ATS check evaluates formatting, keyword density, section headers, contact information, and readability against industry-standard ATS systems."),
        FAQItem(category="Duplicate Detection", question="How does duplicate resume detection work?", answer="We use a combination of content hashing and semantic similarity to detect resumes that are near-identical or from the same candidate submitted under different file names."),
        FAQItem(category="Ranking", question="Can I change the candidate ranking order?", answer="Rankings are based on AI match scores. You can filter and sort candidates by score, status, or other criteria from the Candidates screen."),
        FAQItem(category="Assessment", question="How do I create an assessment?", answer="Go to the Assessment screen, click 'Create Assessment', configure the title, duration, modules, and passing score, then publish to generate a shareable link."),
        FAQItem(category="Assessment", question="How do I assign an assessment to a candidate?", answer="After creating an assessment, use the 'Assign Candidates' section to select candidates from your shortlist. They will receive an invitation link."),
        FAQItem(category="Account & Security", question="Is my data secure?", answer="Yes. All data is stored in Supabase with Row Level Security (RLS). You can only access your own data. Passwords are managed exclusively by Supabase Auth."),
        FAQItem(category="Account & Security", question="How do I change my password?", answer="Go to Settings → Account & Security → Change Password. This uses your Supabase authentication — your password is never stored in our application database."),
        FAQItem(category="Notifications", question="How do I turn off email notifications?", answer="Go to Settings → Notifications and toggle off any notification type. Changes are saved immediately."),
    ]


@router.get("/guides", response_model=list[GuideItem])
async def get_guides(user_id: CurrentUser):
    return [
        GuideItem(
            title="Getting Started with AI Resume Screening",
            description="Complete guide for new recruiters",
            steps=["Sign up / Sign in", "Go to Upload → drag and drop resumes", "Select a job description", "Click 'Analyze Resumes with AI'", "View results on the Candidates screen"],
        ),
        GuideItem(
            title="How to Upload Multiple Resumes",
            description="Upload and manage bulk resume files",
            steps=["Navigate to Upload", "Click 'Select Files' or drag files into the upload zone", "Supported: PDF, DOCX, TXT (max 5MB each)", "Click 'Analyze Resumes with AI'", "Track processing in the file list"],
        ),
        GuideItem(
            title="Understanding Resume Ranking",
            description="How candidates are automatically ranked",
            steps=["AI assigns a match_score (0–100) to each resume", "score >= 60 → Shortlisted automatically", "score < 60 → Rejected automatically", "View ranked candidates on the Ranking screen", "Click a candidate for full profile and resume summary"],
        ),
        GuideItem(
            title="Using ATS Compatibility Check",
            description="Check how well a resume performs against ATS systems",
            steps=["Go to ATS Check", "Upload a resume or select an existing candidate", "View ATS score, keyword density, and formatting issues", "Export the ATS report"],
        ),
        GuideItem(
            title="Creating and Publishing an Assessment",
            description="Build custom skill assessments for candidates",
            steps=["Go to Assessment → Create Assessment", "Set title, duration, and passing score", "Select modules and set weight percentages", "Click 'Save Draft'", "Click 'Publish' to generate a shareable link", "Use 'Assign Candidates' to invite shortlisted candidates"],
        ),
        GuideItem(
            title="Managing Team Members",
            description="Invite and manage your hiring team",
            steps=["Go to Settings → Team", "Click 'Invite Member'", "Enter email, name, and role (Admin / Recruiter / Hiring Manager / Viewer)", "Member receives an invitation", "Manage roles and status from the team table"],
        ),
        GuideItem(
            title="Configuring Notifications",
            description="Stay updated on every recruitment event",
            steps=["Go to Settings → Notifications", "Toggle email and in-app alerts per event type", "Configure reminder timing", "Enable weekly summary for a digest view"],
        ),
    ]
