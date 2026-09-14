"""support.py — Support tickets: create + view own tickets."""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.settings_schemas import SupportTicketCreate, SupportTicketResponse

router = APIRouter(prefix="/api/settings/support", tags=["support"])


@router.get("", response_model=list[SupportTicketResponse])
async def get_tickets(user_id: CurrentUser, sb: SupabaseClient):
    """Returns only the authenticated user's own support tickets."""
    result = sb.from_("support_tickets").select("*").eq("user_id", user_id).order("created_at", desc=True).execute()
    return [SupportTicketResponse(**t) for t in (result.data or [])]


@router.post("", response_model=SupportTicketResponse)
async def create_ticket(body: SupportTicketCreate, user_id: CurrentUser, sb: SupabaseClient):
    insert_payload = {
        "user_id": user_id,
        "category": body.category,
        "subject": body.subject,
        "description": body.description,
        "status": "open",
    }
    try:
        result = sb.from_("support_tickets").insert(insert_payload).select().single().execute()
        item = result.data
    except AttributeError:
        result = sb.from_("support_tickets").insert(insert_payload).execute()
        item = result.data[0] if isinstance(result.data, list) and result.data else result.data
    return SupportTicketResponse(**item)
