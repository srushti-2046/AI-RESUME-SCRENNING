"""integrations.py — Integration status (no secrets exposed)."""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient, AppSettings
from ..schemas.settings_schemas import IntegrationsResponse, IntegrationStatusItem, IntegrationUpdate, MessageResponse

router = APIRouter(prefix="/api/settings/integrations", tags=["integrations"])


@router.get("", response_model=IntegrationsResponse)
async def get_integrations(user_id: CurrentUser, sb: SupabaseClient, settings: AppSettings):
    """Returns actual integration status based on server config + user DB settings. Never exposes secrets."""
    row = sb.from_("integration_settings").select("*").eq("user_id", user_id).maybe_single().execute()
    data = row.data or {}

    integrations = [
        IntegrationStatusItem(
            name="Supabase",
            status="connected" if settings.supabase_url else "not_configured",
            description="Database, Auth, and Storage provider",
        ),
        IntegrationStatusItem(
            name="AI Service",
            status="configured",
            description="Gemini AI for resume analysis and screening",
        ),
        IntegrationStatusItem(
            name="Email Service",
            status="connected" if data.get("email_service_enabled") else "not_connected",
            description="Automated email notifications to candidates",
        ),
        IntegrationStatusItem(
            name="Slack",
            status="connected" if data.get("slack_enabled") and data.get("slack_webhook_url") else "not_connected",
            description="Slack notifications for recruitment events",
        ),
        IntegrationStatusItem(
            name="Microsoft Teams",
            status="connected" if data.get("teams_enabled") and data.get("teams_webhook_url") else "not_connected",
            description="Microsoft Teams notifications for recruitment events",
        ),
    ]
    return IntegrationsResponse(integrations=integrations)


@router.patch("", response_model=MessageResponse)
async def update_integrations(body: IntegrationUpdate, user_id: CurrentUser, sb: SupabaseClient):
    update = body.model_dump(exclude_none=True)
    sb.from_("integration_settings").upsert({"user_id": user_id, **update}).execute()
    return MessageResponse(message="Integration settings updated.")
