"""GET /api/health and GET /api/metadata"""
from datetime import datetime, timezone
from fastapi import APIRouter
from acqwatch.api.deps import get_repository, get_adapter
from acqwatch.api.schemas import HealthResponse, MetadataResponse

router = APIRouter(prefix="/api", tags=["Health"])


@router.get("/health", response_model=HealthResponse, summary="Application health check")
def health():
    """Returns application status, dataset availability, and model health."""
    try:
        repo = get_repository()
        adapter = get_adapter()
        dataset_ok = repo.total_projects > 0
        return HealthResponse(
            status="ok" if dataset_ok else "degraded",
            dataset_available=dataset_ok,
            dataset_project_count=repo.total_projects,
            model_status="ready" if adapter.is_available else "unavailable",
            model_id=adapter.model_id if adapter.is_available else None,
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
        )
    except Exception as exc:
        return HealthResponse(
            status="error",
            dataset_available=False,
            model_status="unavailable",
            timestamp_utc=datetime.now(timezone.utc).isoformat(),
        )


@router.get("/metadata", response_model=MetadataResponse, summary="Dataset and model metadata")
def metadata():
    """Returns verified project count, risk categories, filter fields, and model info."""
    repo = get_repository()
    adapter = get_adapter()
    opts = repo.get_filter_options()
    return MetadataResponse(
        total_projects=repo.total_projects,
        risk_categories=opts["risk_categories"],
        sectors=opts["sectors"],
        states=opts["states"],
        agencies=opts["agencies"],
        filter_fields=opts["sort_fields"],
        geo_precision="State-level administrative centroids (no precise GPS available in source dataset)",
        dataset_source="MoSPI_Flash_Report_Feb2025",
        dataset_last_loaded=repo.load_timestamp,
        model_id=adapter.model_id if adapter.is_available else None,
        model_available=adapter.is_available,
    )
