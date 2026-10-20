"""
GET /api/projects/{id}/explanation — per-project SHAP explanation
GET /api/model/explanation         — global feature importance
"""
from __future__ import annotations

import logging
import pandas as pd
from fastapi import APIRouter, HTTPException

from acqwatch.api.deps import get_adapter, get_repository
from acqwatch.api.schemas import (
    ExplanationResponse,
    GlobalExplanationResponse,
    GlobalImportanceItem,
    RiskDriverItem,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Explainability"])


@router.get(
    "/projects/{project_id}/explanation",
    response_model=ExplanationResponse,
    summary="Per-project SHAP feature explanation",
)
def project_explanation(project_id: str, top_k: int = 4):
    """
    Returns genuine SHAP TreeExplainer values for the requested project.
    Never fabricates SHAP values. Returns structured unavailable status when model is absent.
    SHAP values indicate statistical feature contribution, not legal causation.
    """
    repo = get_repository()
    adapter = get_adapter()

    row = repo.get_project(project_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_id}' not found in the verified project inventory.",
        )

    if not adapter.is_available:
        return ExplanationResponse(
            project_code=str(row["project_code"]),
            available=False,
            unavailable_reason="Model artifact not loaded. SHAP explanation requires the trained model.",
        )

    try:
        single_df = pd.DataFrame([row])
        payload = adapter.explain(single_df, top_k=top_k)

        if not payload.available:
            return ExplanationResponse(
                project_code=str(row["project_code"]),
                available=False,
                unavailable_reason=payload.unavailable_reason,
            )

        return ExplanationResponse(
            project_code=str(row["project_code"]),
            available=True,
            top_risk_drivers=[RiskDriverItem(**d) for d in payload.top_risk_drivers],
            top_mitigating_factors=[RiskDriverItem(**d) for d in payload.top_mitigating_factors],
            base_log_odds=payload.base_log_odds,
            disclaimer=payload.disclaimer,
        )
    except Exception as exc:
        logger.exception("SHAP explanation failed for project_id=%s", project_id)
        return ExplanationResponse(
            project_code=str(row["project_code"]),
            available=False,
            unavailable_reason=f"Explanation generation failed: {type(exc).__name__}",
        )


@router.get(
    "/model/explanation",
    response_model=GlobalExplanationResponse,
    summary="Global model feature importance (mean absolute SHAP)",
)
def model_explanation():
    """
    Returns global mean-absolute SHAP feature importances across all projects.
    These indicate which features most influence the model overall.
    Returns unavailable status if the model is not loaded.
    """
    repo = get_repository()
    adapter = get_adapter()

    if not adapter.is_available:
        return GlobalExplanationResponse(
            available=False,
            unavailable_reason="Model artifact not loaded.",
        )

    try:
        importances = adapter.global_importance(repo.df)
        items = [GlobalImportanceItem(**i) for i in importances]
        return GlobalExplanationResponse(
            available=True,
            model_id=adapter.model_id,
            feature_importances=items,
        )
    except Exception as exc:
        logger.exception("Global importance computation failed")
        return GlobalExplanationResponse(
            available=False,
            unavailable_reason=f"Global importance computation failed: {type(exc).__name__}",
        )
