"""
tests/test_settings.py — Comprehensive settings API tests.
Run: python -m pytest tests/ -v
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import patch, MagicMock

# We patch dependencies so tests run without a live Supabase connection
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.main import app
from app.dependencies import get_current_user, get_supabase_client
from app.config import get_settings

# ─── Fixtures ───────────────────────────────────────────────
TEST_USER_ID = "test-user-uuid-1234"
OTHER_USER_ID = "other-user-uuid-5678"

def override_auth():
    return TEST_USER_ID

def override_supabase():
    mock = MagicMock()
    # Default: return empty data so upserts create new rows
    mock.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
    mock.from_.return_value.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "id": "row-id", "user_id": TEST_USER_ID, "recruiter_id": TEST_USER_ID,
        "theme": "system", "language": "en", "timezone": "UTC",
        "email_notifications": True, "new_resume_alert": True,
        "analysis_completed_alert": True, "duplicate_resume_alert": True,
        "assessment_assigned_alert": True, "assessment_completed_alert": True,
        "shortlisted_alert": True, "rejection_alert": False,
        "weekly_summary": True, "system_security_alerts": True,
        "in_app_notifications": True, "reminder_enabled": True,
        "reminder_hours_before": 24, "reminder_frequency": "once",
        "profile_visibility": "private", "resume_visibility": "private",
        "analytics_enabled": True, "personalization_enabled": True,
        "activity_tracking_enabled": True,
        "minimum_resume_score": 60, "minimum_match_score": 60,
        "minimum_experience_years": 0, "required_education": "any",
        "mandatory_skills": [], "optional_skills": [], "minimum_ats_score": 60,
        "application_received": True, "analysis_completed": True,
        "assessment_invitation": True, "assessment_reminder": True,
        "assessment_completed": True, "shortlisted_notification": True,
        "rejection_notification": False, "new_resume": True,
        "resume_retention_days": 365, "candidate_retention_days": 365,
        "assessment_retention_days": 730, "auto_delete_enabled": False,
        "full_name": "Test User", "email": "test@example.com", "role": "recruiter",
        "created_at": "2026-01-01T00:00:00Z", "updated_at": "2026-09-14T00:00:00Z",
        "email": "test@example.com", "role": "recruiter", "id": TEST_USER_ID,
        "category": "other", "subject": "Test", "description": "Test ticket",
        "status": "open", "admin_reply": None,
        "owner_user_id": TEST_USER_ID, "full_name": "Test User",
        "invited_at": "2026-09-14T00:00:00Z", "joined_at": None,
        "event_type": "application_received", "body": "Hi", "is_active": True,
        "email_service_enabled": False, "slack_enabled": False, "teams_enabled": False,
    }
    mock.from_.return_value.upsert.return_value.select.return_value.single.return_value.execute.return_value.data = mock.from_.return_value.insert.return_value.select.return_value.single.return_value.execute.return_value.data
    return mock

app.dependency_overrides[get_current_user] = override_auth
app.dependency_overrides[get_supabase_client] = override_supabase

client = TestClient(app)

# ─── Auth Tests ──────────────────────────────────────────────

def test_unauthenticated_get_settings_returns_401():
    """Unauthenticated user must be rejected."""
    try:
        app.dependency_overrides.clear()  # remove auth override
        response = client.get("/api/settings/notifications")
        assert response.status_code in (401, 403), "No token should return 401 or 403"
    finally:
        app.dependency_overrides[get_current_user] = override_auth
        app.dependency_overrides[get_supabase_client] = override_supabase


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


# ─── Notification Tests ──────────────────────────────────────

def test_get_notifications_authenticated():
    response = client.get("/api/settings/notifications")
    assert response.status_code == 200
    data = response.json()
    assert "email_notifications" in data
    assert "new_resume_alert" in data
    assert "reminder_hours_before" in data


def test_update_notifications():
    response = client.patch("/api/settings/notifications", json={"email_notifications": False, "weekly_summary": False})
    assert response.status_code == 200


def test_notifications_have_reminder_fields():
    response = client.get("/api/settings/notifications")
    data = response.json()
    assert "reminder_enabled" in data
    assert "reminder_hours_before" in data
    assert "reminder_frequency" in data


# ─── Privacy Tests ───────────────────────────────────────────

def test_get_privacy_settings():
    response = client.get("/api/settings/privacy")
    assert response.status_code == 200
    data = response.json()
    assert "profile_visibility" in data
    assert "analytics_enabled" in data


def test_update_privacy_settings():
    response = client.patch("/api/settings/privacy", json={"profile_visibility": "private", "analytics_enabled": False})
    assert response.status_code == 200


# ─── Screening Tests (Critical: must NOT modify candidates) ──

def test_get_screening_prefs():
    response = client.get("/api/settings/screening")
    assert response.status_code == 200
    data = response.json()
    assert "minimum_resume_score" in data
    assert "note" in data
    # The note must warn that this doesn't change screening logic
    assert "automated screening" in data["note"].lower() or "preferences" in data["note"].lower()


def test_screening_note_warns_about_locked_rule():
    response = client.get("/api/settings/screening")
    data = response.json()
    assert "match_score" in data["note"] or "preferences" in data["note"]


def test_update_screening_prefs_does_not_touch_candidates():
    """Updating screening prefs should only affect recruiter_screening_preferences table."""
    mock_sb = override_supabase()
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    response = client.patch("/api/settings/screening", json={"minimum_match_score": 70})
    assert response.status_code == 200
    # Verify we never touched the 'candidates' table
    calls = [str(call) for call in mock_sb.from_.call_args_list]
    assert not any("candidates" in c for c in calls), "Screening prefs must not query candidates table"
    app.dependency_overrides[get_supabase_client] = override_supabase


# ─── Delete Account Tests ────────────────────────────────────

def test_delete_account_requires_exact_confirmation():
    """Confirmation text must be exactly 'DELETE MY ACCOUNT'."""
    response = client.post("/api/settings/account/delete", json={"confirmation": "delete my account"})
    assert response.status_code == 422  # Validation error

    response = client.post("/api/settings/account/delete", json={"confirmation": "yes"})
    assert response.status_code == 422


def test_delete_account_with_correct_confirmation():
    mock_sb = override_supabase()
    mock_sb.auth.admin.delete_user = MagicMock(return_value=None)
    mock_sb.from_.return_value.delete.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    response = client.post("/api/settings/account/delete", json={"confirmation": "DELETE MY ACCOUNT"})
    assert response.status_code == 200
    app.dependency_overrides[get_supabase_client] = override_supabase


# ─── Support Ticket Tests ────────────────────────────────────

def test_create_support_ticket():
    mock_sb = override_supabase()
    mock_sb.from_.return_value.insert.return_value.select.return_value.single.return_value.execute.return_value.data = {
        "id": "ticket-1", "user_id": TEST_USER_ID, "category": "other",
        "subject": "Test", "description": "Help me please",
        "status": "open", "admin_reply": None,
        "created_at": "2026-09-14T12:00:00Z", "updated_at": "2026-09-14T12:00:00Z"
    }
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    try:
        response = client.post("/api/settings/support", json={"category": "other", "subject": "Test", "description": "Help me please"})
        assert response.status_code == 200
        data = response.json()
        assert data["user_id"] == TEST_USER_ID
    finally:
        app.dependency_overrides[get_supabase_client] = override_supabase


def test_support_ticket_invalid_category():
    response = client.post("/api/settings/support", json={"category": "hacking", "subject": "x", "description": "y" * 10})
    assert response.status_code == 422


# ─── About / FAQ / Guides ────────────────────────────────────

def test_about_returns_version():
    response = client.get("/api/settings/about")
    assert response.status_code == 200
    data = response.json()
    assert "version" in data
    assert data["app_name"] == "AI Resume Screening"


def test_faq_returns_items():
    response = client.get("/api/settings/faq")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "question" in data[0]
    assert "answer" in data[0]


def test_guides_returns_items():
    response = client.get("/api/settings/guides")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "steps" in data[0]


# ─── Email Prefs ─────────────────────────────────────────────

def test_email_prefs_password_never_in_response():
    """Verify email prefs never return a password field."""
    response = client.get("/api/settings/email")
    if response.status_code == 200:
        data = response.json()
        assert "password" not in str(data).lower()


# ─── Integration Secrets ─────────────────────────────────────

def test_integrations_never_expose_secrets():
    """Integrations endpoint must never return API keys."""
    response = client.get("/api/settings/integrations")
    assert response.status_code == 200
    data = str(response.json())
    forbidden = ["service_role", "api_key", "secret", "password", "token"]
    for word in forbidden:
        assert word not in data.lower(), f"Integration response contains sensitive word: {word}"
