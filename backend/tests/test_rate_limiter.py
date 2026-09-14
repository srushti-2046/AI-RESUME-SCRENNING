"""
test_rate_limiter.py — Test suite for Tiered Configurable Rate Limiter & Exponential Backoff.
"""
import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock

from app.main import app
from app.config import Settings
from app.middleware.rate_limiter import get_rate_limiter
from app.dependencies import get_supabase_client, get_current_user, get_settings


client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_limiter():
    """Reset limiter state and restore standard test settings before every test."""
    limiter = get_rate_limiter()
    limiter.reset()
    # Default test settings with low thresholds for fast testing
    test_settings = Settings(
        supabase_url="https://test.supabase.co",
        supabase_service_role_key="test_service_key",
        environment="test",
        rate_limit_enabled=True,
        rate_limit_auth_per_ip_max=3,
        rate_limit_auth_per_account_max=3,
        rate_limit_auth_window_seconds=60,
        rate_limit_auth_backoff_base_seconds=2,
        rate_limit_auth_backoff_max_seconds=60,
        rate_limit_public_max=5,
        rate_limit_public_window_seconds=60,
        rate_limit_auth_user_max=5,
        rate_limit_auth_user_window_seconds=60,
    )
    limiter.update_settings(test_settings)
    app.dependency_overrides[get_settings] = lambda: test_settings
    yield limiter
    limiter.reset()
    app.dependency_overrides.clear()


def test_public_endpoint_rate_limit_and_headers():
    """Verify public endpoints throttle at configured threshold and return RFC headers."""
    # 5 allowed requests
    for i in range(5):
        res = client.get("/health", headers={"X-Forwarded-For": "192.168.1.50"})
        assert res.status_code == 200
        assert res.headers.get("X-RateLimit-Limit") == "5"
        assert res.headers.get("X-RateLimit-Tier") == "public"
        assert int(res.headers.get("X-RateLimit-Remaining")) == 5 - (i + 1)

    # 6th request must be throttled
    res6 = client.get("/health", headers={"X-Forwarded-For": "192.168.1.50"})
    assert res6.status_code == 429
    assert "Retry-After" in res6.headers
    assert int(res6.headers["Retry-After"]) >= 1
    data = res6.json()
    assert data["tier"] == "public"
    assert "Too many requests" in data["detail"]

    # Different IP should still be allowed (IP isolation)
    res_diff_ip = client.get("/health", headers={"X-Forwarded-For": "192.168.1.51"})
    assert res_diff_ip.status_code == 200


def test_authenticated_user_rate_limit_and_user_isolation():
    """Verify authenticated requests are tracked per user token rather than globally."""
    token_a = "Bearer user_token_alpha_12345678901234567890"
    token_b = "Bearer user_token_beta_98765432109876543210"

    # Override current user and supabase dependency
    app.dependency_overrides[get_current_user] = lambda: "mock_user_id"
    mock_sb = MagicMock()
    mock_sb.from_.return_value.select.return_value.eq.return_value.maybe_single.return_value.execute.return_value.data = {
        "id": "mock_user_id", "user_id": "mock_user_id", "recruiter_id": "mock_user_id"
    }
    mock_sb.from_.return_value.select.return_value.eq.return_value.single.return_value.execute.return_value.data = {
        "id": "mock_user_id", "user_id": "mock_user_id", "recruiter_id": "mock_user_id"
    }
    app.dependency_overrides[get_supabase_client] = lambda: mock_sb

    # 5 requests with token A
    for i in range(5):
        res = client.get(
            "/api/settings",
            headers={"Authorization": token_a, "X-Forwarded-For": "10.0.0.1"}
        )
        assert res.status_code == 200
        assert res.headers.get("X-RateLimit-Tier") == "authenticated"

    # 6th request with token A should be 429
    res_a6 = client.get(
        "/api/settings",
        headers={"Authorization": token_a, "X-Forwarded-For": "10.0.0.1"}
    )
    assert res_a6.status_code == 429
    assert res_a6.json()["tier"] == "authenticated"

    # Token B from same IP should still be allowed
    res_b = client.get(
        "/api/settings",
        headers={"Authorization": token_b, "X-Forwarded-For": "10.0.0.1"}
    )
    assert res_b.status_code == 200


def test_auth_login_exponential_backoff_on_failures():
    """Verify failed auth attempts trigger exponential backoff (2s, 4s...) rather than hard lockout."""
    mock_supabase = MagicMock()
    # Mock auth failure (invalid password)
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Invalid login credentials")
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    test_ip = "192.168.100.20"
    email = "recruiter@target.com"

    # Attempts 1, 2, 3: Normal 401s (not yet backed off, under threshold of 3)
    for _ in range(3):
        res = client.post(
            "/api/auth/login",
            json={"email": email, "password": "wrong_password"},
            headers={"X-Forwarded-For": test_ip},
        )
        assert res.status_code == 401

    # Attempt 4: Exceeded threshold (3) -> Exponential backoff is triggered (base = 2s)
    res4 = client.post(
        "/api/auth/login",
        json={"email": email, "password": "wrong_password"},
        headers={"X-Forwarded-For": test_ip},
    )
    assert res4.status_code == 429
    assert "Retry-After" in res4.headers
    retry_sec = int(res4.headers["Retry-After"])
    assert retry_sec >= 1
    detail = res4.json()["detail"].lower()
    assert "too many failed authentication attempts" in detail or "rate limit backoff" in detail or "backoff" in detail


def test_auth_per_account_lockout_across_multiple_ips():
    """Verify attacking the same account from distributed IPs triggers per-account backoff."""
    mock_supabase = MagicMock()
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Bad password")
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    target_email = "executive@company.com"

    # Failures from IP 1, IP 2, IP 3 (same account)
    for ip_suffix in range(1, 4):
        res = client.post(
            "/api/auth/login",
            json={"email": target_email, "password": "wrong_password"},
            headers={"X-Forwarded-For": f"203.0.113.{ip_suffix}"},
        )
        assert res.status_code == 401

    # 4th attempt from a brand new IP (IP 4) targeting the same account
    res4 = client.post(
        "/api/auth/login",
        json={"email": target_email, "password": "wrong_password"},
        headers={"X-Forwarded-For": "203.0.113.99"},
    )
    # Must be 429 due to per-account limit protection!
    assert res4.status_code == 429
    assert "account" in res4.json()["detail"].lower()


def test_auth_success_resets_backoff_and_failures():
    """Verify that a successful authentication resets failure counters and restores immediate access."""
    mock_supabase = MagicMock()
    # First fail once
    mock_supabase.auth.sign_in_with_password.side_effect = Exception("Bad password")
    app.dependency_overrides[get_supabase_client] = lambda: mock_supabase

    client_ip = "192.168.1.75"
    email = "recruiter@valid.com"

    res_fail = client.post(
        "/api/auth/login",
        json={"email": email, "password": "bad_password"},
        headers={"X-Forwarded-For": client_ip},
    )
    assert res_fail.status_code == 401

    # Now mock successful authentication
    mock_session = MagicMock()
    mock_session.access_token = "valid_access_jwt"
    mock_session.refresh_token = "valid_refresh_jwt"
    mock_user = MagicMock()
    mock_user.id = "user_uuid_123"
    mock_user.email = email
    mock_user.user_metadata = {"full_name": "Recruiter One"}

    mock_auth_res = MagicMock()
    mock_auth_res.session = mock_session
    mock_auth_res.user = mock_user

    mock_supabase.auth.sign_in_with_password.side_effect = None
    mock_supabase.auth.sign_in_with_password.return_value = mock_auth_res

    res_success = client.post(
        "/api/auth/login",
        json={"email": email, "password": "correct_password"},
        headers={"X-Forwarded-For": client_ip},
    )
    assert res_success.status_code == 200
    assert res_success.json()["access_token"] == "valid_access_jwt"

    # Status check confirms rate limits are cleared
    res_status = client.get(
        f"/api/auth/status?email={email}",
        headers={"X-Forwarded-For": client_ip}
    )
    assert res_status.status_code == 200
    assert res_status.json()["rate_limit_active"] is False


def test_rate_limiting_can_be_disabled_via_config():
    """Verify that rate_limit_enabled=False bypasses throttling for development or staging."""
    limiter = get_rate_limiter()
    disabled_settings = Settings(
        supabase_url="https://test.supabase.co",
        supabase_service_role_key="test_service_key",
        rate_limit_enabled=False,
        rate_limit_public_max=2,
    )
    limiter.update_settings(disabled_settings)
    app.dependency_overrides[get_settings] = lambda: disabled_settings

    # Send 10 requests when limit was 2 -> should all succeed with 200
    for _ in range(10):
        res = client.get("/health", headers={"X-Forwarded-For": "10.0.0.99"})
        assert res.status_code == 200
