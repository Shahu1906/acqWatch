"""GET /api/overview — Dashboard analytics"""
from typing import Optional
from fastapi import APIRouter, Query
from acqwatch.api.deps import get_repository
from acqwatch.api.schemas import OverviewResponse

router = APIRouter(prefix="/api", tags=["Dashboard"])


@router.get("/overview", response_model=OverviewResponse, summary="Dashboard KPIs")
def overview(
    state: Optional[str] = Query(None, description="Filter by state"),
    sector: Optional[str] = Query(None, description="Filter by sector"),
    risk_category: Optional[str] = Query(None, description="Filter by risk category"),
    agency: Optional[str] = Query(None, description="Filter by implementing agency"),
):
    """
    Returns actual aggregated project metrics.
    Counts refer to the filtered subset; total_projects_in_inventory is always the full 1,477.
    No time-series trends are fabricated — only fields present in the source data are returned.
    """
    repo = get_repository()
    data = repo.get_overview(state=state, sector=sector, risk_category=risk_category, agency=agency)
    return OverviewResponse(**data)
