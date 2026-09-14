"""
routers/dashboard.py — Screen 1: Dashboard API router.
Serves overview metrics, stats, weekly trends, and recent activity.
"""
from fastapi import APIRouter
from ..dependencies import CurrentUser, SupabaseClient
from ..schemas.screen_schemas import DashboardOverviewResponse
from ..services.screen_services import DashboardService

router = APIRouter(prefix="/api/dashboard", tags=["Screen 1: Dashboard"])


@router.get("/overview", response_model=DashboardOverviewResponse)
async def get_dashboard_overview(
    current_user: CurrentUser,
    supabase: SupabaseClient,
):
    """Retrieve complete dashboard KPIs, trends, and recent activity for authenticated recruiter."""
    return DashboardService.get_overview(supabase, current_user)
