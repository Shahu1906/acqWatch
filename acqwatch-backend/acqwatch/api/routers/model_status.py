"""GET /api/model/status"""
from fastapi import APIRouter
from acqwatch.api.deps import get_adapter
from acqwatch.api.schemas import ModelStatusResponse

router = APIRouter(prefix="/api", tags=["Model"])

@router.get("/model/status", response_model=ModelStatusResponse, summary="Model availability and schema")
def model_status():
    """
    Returns actual model availability, identity, feature schema, and hyperparameters.
    No accuracy claims are made without genuine evaluation evidence.
    """
    adapter = get_adapter()
    status = adapter.get_status()
    return ModelStatusResponse(**status)
