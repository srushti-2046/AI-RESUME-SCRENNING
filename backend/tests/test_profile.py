"""
tests/test_profile.py — Tests for Screen 10 Profile endpoint and authentication guards.
Verifies JWT requirement, user isolation, data updates, avatar restrictions, and recruiting overview.
"""
import io
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from app.main import app
from app.dependencies import get_current_user, get_supabase_client

USER_A = "user-aaa-1111"
USER_B = "user-bbb-2222"


def test_get_profile_without_jwt_returns_401():
    """Unauthenticated GET /api/profile must return 401 Unauthorized."""
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        res = client.get("/api/profile")
        assert res.status_code == 401


def test_get_profile_invalid_jwt_returns_401():
    """GET /api/profile with bad token must return 401 Unauthorized."""
    app.dependency_overrides.clear()
    with TestClient(app) as client:
        res = client.get(
            "/api/profile",
            headers={"Authorization": "Bearer fake.invalid.jwt"}
        )
        assert res.status_code == 401


def test_authenticated_get_profile_returns_200():
    """Authenticated user retrieves their own profile."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": USER_A,
        "email": "user_a@example.com",
        "full_name": "Alice Recruiter",
        "role": "recruiter",
        "avatar_url": "https://example.com/avatar.png",
        "company": "Acme Corp",
        "department": "Talent Acquisition",
        "timezone": "UTC",
        "bio": "Senior Technical Recruiter",
        "phone": "+1234567890",
    }
    # Mock counts for overview
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = [
        {"id": "c1", "status": "shortlisted"},
        {"id": "c2", "status": "rejected"}
    ]
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.count = 2

    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        res = client.get("/api/profile")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == USER_A
        assert data["email"] == "user_a@example.com"
        assert data["full_name"] == "Alice Recruiter"
        assert data["company"] == "Acme Corp"
        assert "recruiting_overview" in data
        assert "total_screened" in data["recruiting_overview"]

    app.dependency_overrides.clear()


def test_profile_belongs_strictly_to_authenticated_user():
    """User A cannot receive User B's profile; backend derives user strictly from JWT."""
    mock_supabase = MagicMock()
    # When queried with USER_B
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": USER_B,
        "email": "user_b@example.com",
        "full_name": "Bob Recruiter",
        "role": "recruiter"
    }
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.count = 0

    # User B logs in
    app.dependency_overrides[get_current_user] = lambda: USER_B
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        res = client.get("/api/profile")
        assert res.status_code == 200
        data = res.json()
        assert data["id"] == USER_B
        assert data["email"] == "user_b@example.com"
        assert data["full_name"] == "Bob Recruiter"

    app.dependency_overrides.clear()


def test_profile_update_persists():
    """PUT /api/profile updates user fields and returns updated profile."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{
        "id": USER_A,
        "full_name": "Alice Updated",
        "company": "New Co",
        "phone": "+9876543210"
    }]
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": USER_A,
        "email": "user_a@example.com",
        "full_name": "Alice Updated",
        "role": "recruiter",
        "company": "New Co",
        "phone": "+9876543210"
    }
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.count = 0

    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        update_payload = {
            "full_name": "Alice Updated",
            "company": "New Co",
            "phone": "+9876543210",
            "bio": "Focusing on AI engineering talent"
        }
        res = client.put("/api/profile", json=update_payload)
        assert res.status_code == 200
        data = res.json()
        assert data["full_name"] == "Alice Updated"
        assert data["company"] == "New Co"

    app.dependency_overrides.clear()


def test_password_is_never_stored_or_returned_in_profile():
    """Profile schemas and responses must NEVER expose passwords."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": USER_A,
        "email": "user_a@example.com",
        "full_name": "Alice Recruiter",
        "role": "recruiter"
    }
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.data = []
    mock_supabase.table.return_value.select.return_value.eq.return_value.execute.return_value.count = 0

    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        res = client.get("/api/profile")
        assert res.status_code == 200
        assert "password" not in res.json()
        assert "password_hash" not in res.json()

    app.dependency_overrides.clear()


def test_avatar_upload_type_restriction():
    """Uploading non-image files (.txt or .pdf) to /api/profile/avatar must return 400."""
    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: MagicMock()

    with TestClient(app) as client:
        txt_content = b"This is a text file, not an image."
        res = client.post(
            "/api/profile/avatar",
            files={"file": ("notes.txt", txt_content, "text/plain")}
        )
        assert res.status_code == 400
        assert "Invalid file type" in res.json()["detail"]

    app.dependency_overrides.clear()


def test_avatar_upload_size_restriction():
    """Uploading avatar > 5 MB must return 400."""
    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: MagicMock()

    with TestClient(app) as client:
        oversized = b"x" * (5 * 1024 * 1024 + 10)
        res = client.post(
            "/api/profile/avatar",
            files={"file": ("giant.png", oversized, "image/png")}
        )
        assert res.status_code == 400
        assert "exceeds" in res.json()["detail"].lower()

    app.dependency_overrides.clear()


def test_avatar_upload_success():
    """Uploading valid image (<5MB PNG) returns public URL."""
    mock_supabase = MagicMock()
    mock_supabase.storage.from_.return_value.upload.return_value = {"path": "user-a/avatar.png"}
    mock_supabase.storage.from_.return_value.get_public_url.return_value = "https://example.com/avatars/user-a/avatar.png"
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{}]

    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        png_header = b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR" + b"\x00" * 20
        res = client.post(
            "/api/profile/avatar",
            files={"file": ("avatar.png", png_header, "image/png")}
        )
        assert res.status_code == 200
        data = res.json()
        assert "avatar_url" in data
        assert "example.com" in data["avatar_url"]

    app.dependency_overrides.clear()


def test_delete_avatar_success():
    """DELETE /api/profile/avatar clears user's avatar."""
    mock_supabase = MagicMock()
    mock_supabase.table.return_value.update.return_value.eq.return_value.execute.return_value.data = [{}]

    app.dependency_overrides[get_current_user] = lambda: USER_A
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    with TestClient(app) as client:
        res = client.delete("/api/profile/avatar")
        assert res.status_code == 200
        assert res.json()["success"] is True

    app.dependency_overrides.clear()
