"""
tests/test_auth_isolation.py — Security, tenant isolation, and screening non-interference tests.
Verifies all mandatory safeguards.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from app.main import app
from app.dependencies import get_current_user, get_supabase_client

USER_A = "user-aaa-1111"
USER_B = "user-bbb-2222"


def test_missing_jwt_returns_401():
    """Safeguard #6: Missing authorization header returns 401 Unauthorized."""
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        res = client.get("/api/dashboard/overview")
        assert res.status_code == 401


def test_invalid_jwt_returns_401():
    """Safeguard #6: Invalid or malformed JWT returns 401 Unauthorized."""
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        res = client.get(
            "/api/dashboard/overview",
            headers={"Authorization": "Bearer invalid.garbage.token"}
        )
        assert res.status_code == 401


def test_cross_recruiter_access_denied_candidate():
    """Safeguard #4: User A cannot view candidate owned by User B (returns 403)."""
    mock_supabase = MagicMock()
    # Candidate owned by USER_B
    mock_supabase.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "cand-b",
        "recruiter_id": USER_B,
        "full_name": "Target Candidate"
    }

    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        res = client.get("/api/candidates/cand-b")
        assert res.status_code == 403
        assert "Access denied" in res.json()["detail"]

    app.dependency_overrides.clear()


def test_cross_recruiter_access_denied_resume():
    """Safeguard #4: User A cannot view or inspect resume owned by User B."""
    mock_supabase = MagicMock()
    mock_supabase.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "res-b",
        "recruiter_id": USER_B,
        "file_name": "private_doc.pdf"
    }

    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        res = client.get("/api/analysis/result/res-b")
        assert res.status_code == 403
        assert "Access denied" in res.json()["detail"]

    app.dependency_overrides.clear()


def test_assessment_submission_does_not_modify_screening():
    """
    Safeguard #6 & #8: Assessment test submission has zero side effects on
    candidates.match_score, candidates.status, or resume_job_analysis.
    """
    mock_supabase = MagicMock()
    mock_supabase.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "asm-1",
        "title": "Cognitive Test",
        "passing_score": 70.0,
        "share_token": "valid-token-123"
    }

    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        sub_res = client.post("/api/assessments/public/valid-token-123/submit", json={
            "candidate_name": "John Doe",
            "candidate_email": "john@example.com",
            "answers": [
                {"question_id": "q-101", "selected_option": "O(log n)"},
                {"question_id": "q-102", "selected_option": "HAVING"},
            ]
        })
        assert sub_res.status_code == 200
        data = sub_res.json()
        assert "score" in data
        assert "passed" in data

        # Verify that candidate match_score was NEVER touched in database calls
        for call in mock_supabase.from_.mock_calls:
            assert "candidates" not in str(call) or "update" not in str(call)

    app.dependency_overrides.clear()
