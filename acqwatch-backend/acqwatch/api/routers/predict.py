"""
GET  /api/projects/{id}/prediction  — stored precomputed prediction
POST /api/predict                   — ad-hoc prediction for user-supplied inputs
"""
from __future__ import annotations

import logging
import sys
from typing import Optional

import pandas as pd
from fastapi import APIRouter, HTTPException

from acqwatch.api.deps import get_adapter, get_repository
from acqwatch.api.schemas import (
    AdHocPredictRequest,
    AdHocPredictResponse,
    PredictionResponse,
)

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["Prediction"])

BAND_LABELS = {
    "LOW": "LOW RISK",
    "MEDIUM": "MEDIUM RISK",
    "HIGH": "HIGH RISK",
    "CRITICAL": "CRITICAL RISK",
}
BAND_COLORS = {
    "LOW": "#10B981",
    "MEDIUM": "#F59E0B",
    "HIGH": "#F97316",
    "CRITICAL": "#EF4444",
}
BAND_DESCRIPTIONS = {
    "LOW": "On schedule. Procedural risk profile is within normal operational tolerance.",
    "MEDIUM": "Moderate vulnerability. Clearance lead times or agency pacing require observation.",
    "HIGH": "Substantial bottleneck risk. High likelihood of statutory or administrative timeline breach.",
    "CRITICAL": "Acute delay probability. Multi-factor delay indicators active.",
}


def _classify_score(score: int) -> str:
    if score <= 30:
        return "LOW"
    elif score <= 60:
        return "MEDIUM"
    elif score <= 80:
        return "HIGH"
    return "CRITICAL"


@router.get(
    "/projects/{project_id}/prediction",
    response_model=PredictionResponse,
    summary="Precomputed model prediction for a project",
)
def project_prediction(project_id: str):
    """
    Returns the genuine precomputed model prediction for an existing project.
    Predictions are generated from the loaded Gradient Boosting model at startup.
    Returns a structured unavailable status if the model is absent or features are missing.
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
        return PredictionResponse(
            project_code=str(row["project_code"]),
            available=False,
            unavailable_reason="Model artifact not loaded. See /api/model/status for details.",
        )

    risk_score_raw = row.get("risk_score")
    risk_prob_raw = row.get("risk_probability")

    try:
        risk_score = int(float(risk_score_raw))
        risk_prob = round(float(risk_prob_raw), 4)
    except (TypeError, ValueError):
        return PredictionResponse(
            project_code=str(row["project_code"]),
            available=False,
            unavailable_reason="Risk precomputation data unavailable for this project.",
        )

    band = _classify_score(risk_score)
    return PredictionResponse(
        project_code=str(row["project_code"]),
        available=True,
        probability=risk_prob,
        risk_score=risk_score,
        risk_category=band,
        badge_color=BAND_COLORS[band],
        badge_label=BAND_LABELS[band],
        description=BAND_DESCRIPTIONS[band],
        model_id=adapter.model_id,
        prediction_source="precomputed",
    )


@router.post(
    "/predict",
    response_model=AdHocPredictResponse,
    summary="Ad-hoc prediction for user-supplied project attributes",
)
def ad_hoc_predict(body: AdHocPredictRequest):
    """
    Runs a fresh inference on user-supplied baseline project attributes.
    The model never retrains on this request. Preprocessing matches the training pipeline exactly.
    Returns a structured unavailable status if the model is absent.
    """
    adapter = get_adapter()

    if not adapter.is_available:
        return AdHocPredictResponse(
            available=False,
            unavailable_reason="Model artifact not loaded. See /api/model/status for details.",
        )

    # Build a minimal DataFrame compatible with FeaturePipeline
    row = {
        "orig_cost_cr": body.orig_cost_cr,
        "sector": body.sector,
        "agency": body.agency,
        "state": body.state,
        "approval_date": body.approval_date or f"{body.approval_year or 2020}-06-01",
        "orig_commissioning_date": body.orig_commissioning_date or f"{(body.approval_year or 2020) + 2}-06-01",
        "delay_months": 0,
        "is_delayed": 0,
    }
    if body.planned_duration_months:
        row["planned_duration_months"] = body.planned_duration_months
    if body.approval_year:
        row["approval_year"] = body.approval_year
    if body.approval_month:
        row["approval_month"] = body.approval_month

    df = pd.DataFrame([row])

    try:
        probs = adapter.predict_proba(df)
        prob = float(probs[0])
        score = int(round(prob * 100))
        band = _classify_score(score)
        return AdHocPredictResponse(
            available=True,
            probability=round(prob, 4),
            risk_score=score,
            risk_category=band,
            badge_color=BAND_COLORS[band],
            badge_label=BAND_LABELS[band],
            description=BAND_DESCRIPTIONS[band],
            model_id=adapter.model_id,
        )
    except Exception as exc:
        logger.exception("Ad-hoc prediction failed for sector=%s state=%s", body.sector, body.state)
        return AdHocPredictResponse(
            available=False,
            unavailable_reason=f"Prediction failed: {type(exc).__name__}. "
                               "Check that all required baseline attributes are valid.",
        )
