"""
account.py — Account info, delete account, sign out all devices.

IMPORTANT:
- Password changes are handled by the Supabase client (updateUser) — NOT this API
- Delete account requires explicit confirmation text: "DELETE MY ACCOUNT"
- Every operation is scoped to the authenticated user's own data only
"""
import logging
from fastapi import APIRouter, HTTPException, status

from ..dependencies import CurrentUser, SupabaseClient, AppSettings
from ..schemas.settings_schemas import AccountResponse, DeleteAccountRequest, MessageResponse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/settings/account", tags=["account"])


@router.get("", response_model=AccountResponse, summary="Get account information")
async def get_account(user_id: CurrentUser, sb: SupabaseClient) -> AccountResponse:
    """Returns account info derived from profiles table and auth metadata."""
    profile = sb.from_("profiles").select("*").eq("id", user_id).single().execute()
    if not profile.data:
        raise HTTPException(status_code=404, detail="Account not found")

    auth_user = sb.auth.admin.get_user_by_id(user_id)
    last_sign_in = None
    if auth_user and auth_user.user:
        last_sign_in = auth_user.user.last_sign_in_at

    return AccountResponse(
        id=profile.data["id"],
        email=profile.data.get("email"),
        full_name=profile.data.get("full_name"),
        role=profile.data.get("role"),
        created_at=profile.data.get("created_at"),
        last_sign_in_at=last_sign_in,
    )


@router.post("/sign-out-all", response_model=MessageResponse, summary="Sign out all devices")
async def sign_out_all_devices(user_id: CurrentUser, sb: SupabaseClient) -> MessageResponse:
    """
    Signs out the user from all active sessions using Supabase Admin API.
    The current session will also be invalidated server-side.
    """
    try:
        sb.auth.admin.sign_out(user_id, scope="global")
        logger.info("User %s signed out from all devices", user_id)
        return MessageResponse(message="Signed out from all devices successfully.")
    except Exception as exc:
        logger.error("Sign-out-all failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Could not sign out from all devices. Please try again.",
        ) from exc


@router.post("/delete", response_model=MessageResponse, summary="Delete account")
async def delete_account(
    body: DeleteAccountRequest,
    user_id: CurrentUser,
    sb: SupabaseClient,
) -> MessageResponse:
    """
    Permanently deletes the authenticated user's account.

    Requirements:
    - Confirmation text must be exactly: DELETE MY ACCOUNT
    - Deletes only the authenticated user's data (not other users' data)
    - Removes: settings tables, support tickets, team memberships
    - Finally deletes the Supabase Auth user record

    The on-delete-cascade on profiles will clean up related records.
    """
    # body.confirmation is already validated by Pydantic to be "DELETE MY ACCOUNT"
    try:
        # 1. Clean up user-owned settings tables (cascade handles most)
        settings_tables = [
            "user_settings", "notification_preferences", "privacy_settings",
            "data_retention_settings", "integration_settings",
            "email_preferences", "email_templates",
            "recruiter_screening_preferences", "support_tickets",
            "team_members",
        ]
        for table in settings_tables:
            user_col = "recruiter_id" if table in ("email_preferences", "email_templates", "recruiter_screening_preferences", "team_members") else "user_id"
            try:
                sb.from_(table).delete().eq(user_col, user_id).execute()
            except Exception:
                pass  # May not exist — continue cleanup

        # 2. Delete auth user (cascades to profiles via on delete cascade)
        sb.auth.admin.delete_user(user_id)

        logger.info("Account permanently deleted for user %s", user_id)
        return MessageResponse(message="Your account has been permanently deleted.")

    except Exception as exc:
        logger.error("Account deletion failed for %s: %s", user_id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Account deletion failed. Please contact support.",
        ) from exc
