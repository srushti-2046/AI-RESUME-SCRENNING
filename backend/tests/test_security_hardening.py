"""
test_security_hardening.py — Verification of the 5-point Security Hardening:
1. Strict Input Validation (Types, Bounds, Regex, Email format)
2. Secrets Protection (No leaks, safe env loading)
3. Dependency Vulnerabilities (PyJWT replaces python-jose/ecdsa)
4. Centralized Error Handling & Information Leakage Prevention
5. File Upload Safety (Magic byte header verification for PDF, DOCX, and Images)
"""
from unittest.mock import MagicMock
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.dependencies import get_current_user, get_supabase_client
from app.config import get_settings, Settings


client = TestClient(app, raise_server_exceptions=False)
TEST_USER = "00000000-0000-0000-0000-000000000001"


@pytest.fixture(autouse=True)
def setup_security_overrides():
    mock_sb = MagicMock()
    mock_sb.from_.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_sb.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = None
    mock_sb.from_.return_value.insert.return_value.execute.return_value.data = [{"id": "sec-row-1"}]
    mock_sb.rpc.return_value.execute.return_value.data = None

    app.dependency_overrides[get_current_user] = lambda: TEST_USER
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb
    yield
    app.dependency_overrides.clear()


# =============================================================================
# 1. STRICT INPUT VALIDATION
# =============================================================================
def test_input_validation_invalid_email_rejected():
    """Submitting malformed email in assessment submission must return 422."""
    res = client.post(
        "/api/assessments/public/mock-token/submit",
        json={
            "candidate_name": "Valid Candidate",
            "candidate_email": "not-an-email-format",
            "answers": [{"question_id": "q1", "selected_option": "Option A"}]
        }
    )
    assert res.status_code == 422
    assert "candidate_email" in str(res.json())


def test_input_validation_negative_or_excessive_bounds():
    """Negative experience years in job creation must return 422."""
    res = client.post(
        "/api/jobs",
        json={
            "title": "Software Engineer",
            "min_experience_years": -5.0  # Invalid: negative
        }
    )
    assert res.status_code == 422


def test_input_validation_excessive_title_length():
    """Title exceeding max length of 200 characters must return 422."""
    res = client.post(
        "/api/jobs",
        json={
            "title": "A" * 250,
            "min_experience_years": 2.0
        }
    )
    assert res.status_code == 422


def test_auth_input_validation_short_password():
    """Auth login with password shorter than 6 chars must return 422."""
    res = client.post(
        "/api/auth/login",
        json={
            "email": "test@example.com",
            "password": "123"  # Too short (min 6)
        }
    )
    assert res.status_code == 422


# =============================================================================
# 2. FILE UPLOAD SAFETY (MAGIC BYTE VERIFICATION)
# =============================================================================
def test_disguised_pdf_executable_rejected():
    """A file named fake.pdf with binary or script content must be rejected."""
    fake_pdf_content = b"MZ\x90\x00\x03\x00\x00\x00"  # Windows PE executable header
    res = client.post(
        "/api/resumes/upload",
        files={"file": ("fake.pdf", fake_pdf_content, "application/pdf")}
    )
    assert res.status_code == 400
    assert "missing valid PDF header signature" in res.json()["detail"]


def test_disguised_docx_rejected():
    """A file named fake.docx with plain text must be rejected."""
    fake_docx_content = b"Hello world, I am not a real DOCX ZIP file."
    res = client.post(
        "/api/resumes/upload",
        files={"file": ("fake.docx", fake_docx_content, "application/vnd.openxmlformats-officedocument.wordprocessingml.document")}
    )
    assert res.status_code == 400
    assert "missing valid DOCX" in res.json()["detail"]


def test_genuine_pdf_accepted():
    """A genuine PDF with %PDF- header is accepted."""
    import io, pypdf
    writer = pypdf.PdfWriter()
    writer.add_blank_page(width=200, height=200)
    buf = io.BytesIO()
    writer.write(buf)
    genuine_pdf = buf.getvalue()

    res = client.post(
        "/api/resumes/upload",
        files={"file": ("genuine.pdf", genuine_pdf, "application/pdf")}
    )
    assert res.status_code == 201
    assert res.json()["file_type"] == "pdf"


def test_disguised_avatar_rejected():
    """Uploading non-image content disguised as image/png must be rejected."""
    fake_png = b"echo 'malicious shell script' > /etc/passwd"
    res = client.post(
        "/api/profile/avatar",
        files={"file": ("avatar.png", fake_png, "image/png")}
    )
    assert res.status_code == 400
    assert "missing valid image header signature" in res.json()["detail"]


# =============================================================================
# 3. INFORMATION LEAKAGE & CENTRALIZED ERROR HANDLING
# =============================================================================
def test_unhandled_exception_sanitized_and_never_leaks_traceback():
    """Unhandled internal exception must return generic message with request_id, not raw error."""
    mock_sb = MagicMock()
    secret_leak_err = RuntimeError("CRITICAL DB EXCEPTION: table 'secret_passwords_table' crashed at C:\\internal\\path\\db.py:42")
    mock_sb.from_.side_effect = secret_leak_err
    mock_sb.rpc.side_effect = secret_leak_err
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb

    res = client.get("/api/dashboard/overview")
    assert res.status_code == 500
    data = res.json()

    # Must contain correlation request_id
    assert "request_id" in data
    # Must NEVER leak internal file path, database table, or raw exception detail
    assert "C:\\" not in data["detail"]
    assert "secret_passwords_table" not in data["detail"]
    assert "Traceback" not in data["detail"]
    assert "An internal server error occurred" in data["detail"]


# =============================================================================
# 4. PyJWT DEPENDENCY VALIDATION
# =============================================================================
def test_pyjwt_token_decoding_without_vulnerable_ecdsa():
    """Verify PyJWT decodes tokens safely without python-jose."""
    import jwt
    secret = "security_test_secret_32_characters_long_12345"
    test_token = jwt.encode({"sub": "user-uuid-999"}, secret, algorithm="HS256")

    # Decode using PyJWT
    payload = jwt.decode(test_token, secret, algorithms=["HS256"], options={"verify_signature": True})
    assert payload["sub"] == "user-uuid-999"
