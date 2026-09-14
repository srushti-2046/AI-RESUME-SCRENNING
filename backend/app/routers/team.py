"""team.py — Team management: invite, view, update roles."""
from fastapi import APIRouter, HTTPException, status
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import TeamInviteRequest, TeamMemberUpdate, TeamMemberResponse, MessageResponse

router = APIRouter(prefix="/api/settings/team", tags=["team"])


@router.get("", response_model=list[TeamMemberResponse])
async def get_team(user_id: CurrentUser, sb: SupabaseClient):
    result = sb.from_("team_members").select("*").eq("owner_user_id", user_id).order("created_at").execute()
    return [TeamMemberResponse(**m) for m in (result.data or [])]


@router.post("/invite", response_model=TeamMemberResponse)
async def invite_member(body: TeamInviteRequest, user_id: CurrentUser, sb: SupabaseClient):
    """Invite a team member. Only the owner/admin can do this."""
    existing = sb.from_("team_members").select("id").eq("owner_user_id", user_id).eq("email", body.email).maybe_single().execute()
    if existing.data:
        raise HTTPException(status_code=409, detail="This email is already invited to your team.")

    result = sb.from_("team_members").insert({
        "owner_user_id": user_id,
        "email": body.email,
        "full_name": body.full_name,
        "role": body.role,
        "status": "invited",
    }).execute()
    item = result.data[0] if isinstance(result.data, list) and result.data else result.data
    return TeamMemberResponse(**item)


@router.patch("/{member_id}", response_model=TeamMemberResponse)
async def update_member(
    member_id: str,
    body: TeamMemberUpdate,
    user_id: CurrentUser,
    sb: SupabaseClient,
):
    """Update a team member's role or status. Owner only — cannot self-elevate."""
    # Verify this member belongs to the authenticated owner
    existing = sb.from_("team_members").select("*").eq("id", member_id).eq("owner_user_id", user_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Team member not found.")

    # Prevent privilege escalation — member cannot grant themselves admin
    if existing.data.get("member_user_id") == user_id and body.role == "admin":
        raise HTTPException(status_code=403, detail="Cannot change your own role.")

    update = body.model_dump(exclude_none=True)
    result = sb.from_("team_members").update(update).eq("id", member_id).eq("owner_user_id", user_id).execute()
    item = result.data[0] if isinstance(result.data, list) and result.data else result.data
    return TeamMemberResponse(**item)


@router.delete("/{member_id}", response_model=MessageResponse)
async def remove_member(member_id: str, user_id: CurrentUser, sb: SupabaseClient):
    existing = sb.from_("team_members").select("id").eq("id", member_id).eq("owner_user_id", user_id).maybe_single().execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Team member not found.")
    sb.from_("team_members").delete().eq("id", member_id).eq("owner_user_id", user_id).execute()
    return MessageResponse(message="Team member removed.")
