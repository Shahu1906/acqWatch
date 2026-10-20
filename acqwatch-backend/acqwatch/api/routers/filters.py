"""GET /api/filters — available filter option values"""
from fastapi import APIRouter
from acqwatch.api.deps import get_repository
from acqwatch.api.schemas import FiltersResponse

router = APIRouter(prefix="/api", tags=["Filters"])

@router.get("/filters", response_model=FiltersResponse, summary="Available filter option values")
def get_filters():
    """Returns all distinct values available for each filter field, derived from actual data."""
    repo = get_repository()
    opts = repo.get_filter_options()
    return FiltersResponse(**opts)
