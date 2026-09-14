"""
tests/test_screens_1_to_8.py — Integration tests for Screens 1 through 8.
Tests all endpoints with dependency overrides for fast, deterministic execution.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from app.main import app
from app.dependencies import get_current_user, get_supabase_client

TEST_USER_ID = "recruiter-uuid-1111"
OTHER_USER_ID = "recruiter-uuid-2222"


@pytest.fixture
def client():
    mock_supabase = MagicMock()
    # Default mock responses
    mock_supabase.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_supabase.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
    mock_supabase.from_.return_value.insert.return_value.execute.return_value.data = [{"id": "new-row-id"}]
    mock_supabase.rpc.return_value.execute.return_value.data = None

    app.dependency_overrides[get_current_user] = lambda: TEST_USER_ID
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# =============================================================================
# SCREEN 1: DASHBOARD
# =============================================================================
def test_dashboard_overview_authenticated(client):
    res = client.get("/api/dashboard/overview")
    assert res.status_code == 200
    data = res.json()
    assert "stats" in data
    assert "total_candidates" in data["stats"]
    assert "shortlisted_candidates" in data["stats"]
    assert "rejected_candidates" in data["stats"]


# =============================================================================
# SCREEN 2: RESUME UPLOAD & JOBS
# =============================================================================
def test_resume_upload_pdf_success(client):
    import io, pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    pdf_bytes = buf.getvalue()

    res = client.post(
        "/api/resumes/upload",
        files={"file": ("sample_resume.pdf", pdf_bytes, "application/pdf")}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["file_name"] == "sample_resume.pdf"
    assert data["file_type"] == "pdf"


def test_resume_upload_docx_success(client):
    import io, docx
    doc = docx.Document()
    doc.add_paragraph("Jane Doe — Senior Python & FastAPI Engineer")
    buf = io.BytesIO()
    doc.save(buf)
    docx_bytes = buf.getvalue()

    res = client.post(
        "/api/resumes/upload",
        files={"file": ("jane_doe.docx", docx_bytes, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    )
    assert res.status_code == 201
    data = res.json()
    assert data["file_name"] == "jane_doe.docx"
    assert data["file_type"] == "docx"


def test_resume_upload_txt_rejected_safeguard(client):
    """Safeguard #1: TXT files are strictly prohibited (PDF and DOCX only)."""
    txt_bytes = b"Jane Doe - Software Engineer"
    res = client.post(
        "/api/resumes/upload",
        files={"file": ("resume.txt", txt_bytes, "text/plain")}
    )
    assert res.status_code == 400
    assert "PDF and DOCX" in res.json()["detail"]


def test_resume_upload_exceeds_10mb_rejected(client):
    """Safeguard #1: Files exceeding 10MB are strictly rejected."""
    large_bytes = b"A" * (11 * 1024 * 1024)
    res = client.post(
        "/api/resumes/upload",
        files={"file": ("huge_resume.pdf", large_bytes, "application/pdf")}
    )
    assert res.status_code == 400
    assert "exceeds the 10MB limit" in res.json()["detail"]


def test_job_creation_and_listing(client):
    res = client.post("/api/jobs", json={
        "title": "Senior AI Backend Engineer",
        "department": "Engineering",
        "description": "Seeking Python and FastAPI expert",
        "required_skills": ["Python", "FastAPI", "PostgreSQL"],
    })
    assert res.status_code == 201
    assert res.json()["title"] == "Senior AI Backend Engineer"

    list_res = client.get("/api/jobs")
    assert list_res.status_code == 200


# =============================================================================
# SCREEN 3: CANDIDATES
# =============================================================================
def test_get_candidates_and_counts(client):
    res = client.get("/api/candidates?status=all")
    assert res.status_code == 200
    assert isinstance(res.json(), list)

    counts_res = client.get("/api/candidates/counts")
    assert counts_res.status_code == 200
    counts = counts_res.json()
    assert "all" in counts
    assert "shortlisted" in counts
    assert "rejected" in counts
    assert counts["all"] == counts["shortlisted"] + counts["rejected"]


def test_no_manual_candidate_status_override_endpoint(client):
    """Safeguard #2: No manual status override endpoint is exposed."""
    patch_res = client.patch("/api/candidates/cand-123/status", json={"status": "shortlisted"})
    assert patch_res.status_code in [404, 405]

    put_res = client.put("/api/candidates/cand-123/status", json={"status": "shortlisted"})
    assert put_res.status_code in [404, 405]


# =============================================================================
# SCREEN 4: ANALYSIS RESULT & LOCKED SCREENING RULE
# =============================================================================
def test_screening_rule_thresholds(client):
    """
    Safeguard #6:
      match_score >= 60 -> shortlisted
      match_score < 60  -> rejected
    """
    # Mock job ownership
    mock = app.dependency_overrides[get_supabase_client]()
    mock.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "job-101", "recruiter_id": TEST_USER_ID, "title": "Backend Dev"
    }

    res = client.post("/api/analysis/analyze", json={
        "job_id": "job-101",
        "resume_ids": ["res-1", "res-2"]
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    for r in data["results"]:
        if r["match_score"] >= 60.0:
            assert r["status"] == "shortlisted"
        else:
            assert r["status"] == "rejected"


# =============================================================================
# SCREEN 5: CANDIDATE RANKING
# =============================================================================
def test_candidate_ranking(client):
    res = client.get("/api/ranking")
    assert res.status_code == 200
    data = res.json()
    assert "total_ranked" in data
    assert "candidates" in data


# =============================================================================
# SCREEN 6: ATS COMPATIBILITY
# =============================================================================
def test_ats_check_preserves_screening_data(client):
    mock = app.dependency_overrides[get_supabase_client]()
    mock.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "res-ats", "recruiter_id": TEST_USER_ID, "file_name": "resume.pdf"
    }

    res = client.post("/api/ats/check", json={"resume_id": "res-ats"})
    assert res.status_code == 200
    data = res.json()
    assert data["ats_score"] > 0
    assert "checks" in data
    assert data["analysis_version"] == "ats_v1"


# =============================================================================
# SCREEN 7: DUPLICATE RESUME DETECTION
# =============================================================================
def test_duplicate_overview_and_scan(client):
    res = client.get("/api/duplicate/overview")
    assert res.status_code == 200
    assert "scanned_count" in res.json()

    scan_res = client.post("/api/duplicate/scan")
    assert scan_res.status_code == 200


# =============================================================================
# SCREEN 8: ASSESSMENT BUILDER & EVALUATION
# =============================================================================
def test_assessment_weights_must_total_100(client):
    """Safeguard #8: Module weights must total exactly 100%."""
    invalid_res = client.post("/api/assessments", json={
        "title": "Python Quiz",
        "duration_minutes": 30,
        "passing_score": 70.0,
        "module_weights": [
            {"module_id": "mod-python", "weight": 60.0},
            {"module_id": "mod-sql", "weight": 30.0},  # sum = 90% != 100%
        ]
    })
    assert invalid_res.status_code == 422

    valid_res = client.post("/api/assessments", json={
        "title": "Full Stack Assessment",
        "duration_minutes": 45,
        "passing_score": 75.0,
        "module_weights": [
            {"module_id": "mod-python", "weight": 60.0},
            {"module_id": "mod-sql", "weight": 40.0},  # sum = 100%
        ]
    })
    assert valid_res.status_code == 201
    assert len(valid_res.json()["share_token"]) == 48


def test_public_assessment_projection_safe(client):
    """Safeguard #8: Public candidate view never leaks correct answers or explanations."""
    mock = app.dependency_overrides[get_supabase_client]()
    mock.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "asm-123", "title": "Python Skills Test", "duration_minutes": 30, "share_token": "token-xyz"
    }

    res = client.get("/api/assessments/public/token-xyz")
    assert res.status_code == 200
    data = res.json()
    assert "questions" in data
    for q in data["questions"]:
        assert "correct_answer" not in q
        assert "explanation" not in q
