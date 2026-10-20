"""
Pydantic schemas for all AcqWatch API request/response models.
Stable field names — the frontend can depend on these shapes.
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, ConfigDict


# ── Shared ────────────────────────────────────────────────────────────────────

class ErrorResponse(BaseModel):
    detail: str


# ── Health / Metadata ─────────────────────────────────────────────────────────

class HealthResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    status: str                         # "ok" | "degraded" | "error"
    dataset_available: bool
    dataset_project_count: Optional[int] = None
    model_status: str                   # "ready" | "unavailable"
    model_id: Optional[str] = None
    timestamp_utc: str


class MetadataResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    total_projects: int
    risk_categories: List[str]
    sectors: List[str]
    states: List[str]
    agencies: List[str]
    filter_fields: List[str]
    geo_precision: str
    dataset_source: str
    dataset_last_loaded: Optional[str] = None
    model_id: Optional[str] = None
    model_available: bool


# ── Overview ──────────────────────────────────────────────────────────────────

class OverviewResponse(BaseModel):
    total_projects_in_inventory: int
    matching_projects: int
    filters_applied: bool
    delayed_count: int
    on_time_count: int
    delay_rate_pct: float
    counts_by_risk_category: Dict[str, int]
    percentages_by_risk_category: Dict[str, float]
    sector_distribution: Dict[str, int]
    state_distribution: Dict[str, int]
    cost_stats: Dict[str, float]
    predictions_available: bool
    dataset_last_loaded: Optional[str] = None


# ── Projects ──────────────────────────────────────────────────────────────────

class ProjectSummary(BaseModel):
    project_code: str
    project_name: str
    sector: str
    agency: str
    state: str
    orig_cost_cr: Optional[float] = None
    approval_date: Optional[str] = None
    orig_commissioning_date: Optional[str] = None
    ant_commissioning_date: Optional[str] = None
    delay_months: Optional[int] = None
    is_delayed: Optional[int] = None
    risk_score: Optional[int] = None
    risk_category: Optional[str] = None
    badge_color: Optional[str] = None


class ProjectListResponse(BaseModel):
    items: List[ProjectSummary]
    page: int
    page_size: int
    total: int
    total_pages: int


class ProjectDetail(BaseModel):
    project_code: str
    project_name: str
    sector: str
    agency: str
    state: str
    approval_date: Optional[str] = None
    orig_commissioning_date: Optional[str] = None
    rev_commissioning_date: Optional[str] = None
    ant_commissioning_date: Optional[str] = None
    orig_cost_cr: Optional[float] = None
    rev_cost_cr: Optional[float] = None
    ant_cost_cr: Optional[float] = None
    cumulative_exp_cr: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    delay_months: Optional[int] = None
    is_delayed: Optional[int] = None
    cost_overrun_pct: Optional[float] = None
    expenditure_ratio: Optional[float] = None
    source_dataset: Optional[str] = None
    # Risk
    risk_score: Optional[int] = None
    risk_category: Optional[str] = None
    badge_color: Optional[str] = None
    risk_probability: Optional[float] = None
    # Geo (state-level centroids — not precise GPS)
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    geo_precision: Optional[str] = None
    # Prediction metadata
    prediction_available: bool = False
    prediction_source: Optional[str] = None   # "precomputed" | None


# ── Map ───────────────────────────────────────────────────────────────────────

class GeoPoint(BaseModel):
    type: str = "Point"
    coordinates: List[float]   # [longitude, latitude]


class MapFeatureProperties(BaseModel):
    project_code: str
    project_name: str
    sector: str
    agency: str
    state: str
    orig_cost_cr: Optional[float] = None
    delay_months: Optional[int] = None
    risk_score: Optional[int] = None
    risk_category: Optional[str] = None
    badge_color: Optional[str] = None
    geo_precision: str
    is_delayed: Optional[int] = None


class MapFeature(BaseModel):
    type: str = "Feature"
    geometry: GeoPoint
    properties: MapFeatureProperties


class MapResponse(BaseModel):
    type: str = "FeatureCollection"
    features: List[MapFeature]
    total_features: int
    geo_precision_note: str = (
        "All coordinates are administrative state-level centroids. "
        "No project has a verified precise GPS location in the source dataset."
    )


# ── Prediction ────────────────────────────────────────────────────────────────

class PredictionResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    project_code: str
    available: bool
    probability: Optional[float] = None
    risk_score: Optional[int] = None
    risk_category: Optional[str] = None
    badge_color: Optional[str] = None
    badge_label: Optional[str] = None
    description: Optional[str] = None
    model_id: Optional[str] = None
    prediction_source: Optional[str] = None   # "precomputed" | "fresh"
    unavailable_reason: Optional[str] = None


class AdHocPredictRequest(BaseModel):
    sector: str = Field(..., description="Infrastructure sector, e.g. 'ROAD TRANSPORT AND HIGHWAYS'")
    agency: str = Field(..., description="Implementing agency, e.g. 'NHAI'")
    state: str = Field(..., description="Indian state or UT, e.g. 'MAHARASHTRA'")
    orig_cost_cr: float = Field(..., gt=0, description="Sanctioned cost in INR Crores")
    approval_date: Optional[str] = Field(None, description="YYYY-MM-01 format")
    orig_commissioning_date: Optional[str] = Field(None, description="YYYY-MM-01 format")
    planned_duration_months: Optional[float] = Field(None, gt=0)
    approval_year: Optional[int] = Field(None)
    approval_month: Optional[int] = Field(None)


class AdHocPredictResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    available: bool
    probability: Optional[float] = None
    risk_score: Optional[int] = None
    risk_category: Optional[str] = None
    badge_color: Optional[str] = None
    badge_label: Optional[str] = None
    description: Optional[str] = None
    model_id: Optional[str] = None
    prediction_source: str = "fresh"
    disclaimer: str = (
        "DECISION SUPPORT ONLY: This is a statistical model output, not a legal or administrative determination."
    )
    unavailable_reason: Optional[str] = None


# ── Explanation ───────────────────────────────────────────────────────────────

class RiskDriverItem(BaseModel):
    feature: str
    shap_value: float
    direction: str     # "ELEVATES_RISK" | "MITIGATES_RISK"
    explanation: str


class ExplanationResponse(BaseModel):
    project_code: str
    available: bool
    top_risk_drivers: List[RiskDriverItem] = []
    top_mitigating_factors: List[RiskDriverItem] = []
    base_log_odds: Optional[float] = None
    disclaimer: Optional[str] = None
    unavailable_reason: Optional[str] = None


class GlobalImportanceItem(BaseModel):
    feature: str
    mean_abs_shap: float


class GlobalExplanationResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    available: bool
    model_id: Optional[str] = None
    feature_importances: List[GlobalImportanceItem] = []
    note: str = (
        "Global importances are mean absolute SHAP values across all projects. "
        "They indicate statistical association, not causal effect."
    )
    unavailable_reason: Optional[str] = None


# ── Filters ───────────────────────────────────────────────────────────────────

class FiltersResponse(BaseModel):
    states: List[str]
    sectors: List[str]
    agencies: List[str]
    risk_categories: List[str]
    sort_fields: List[str]


# ── Model Status ──────────────────────────────────────────────────────────────

class ModelStatusResponse(BaseModel):
    model_config = ConfigDict(protected_namespaces=())
    available: bool
    model_id: Optional[str] = None
    model_type: Optional[str] = None
    framework: Optional[str] = None
    artifact_path: Optional[str] = None
    feature_count: Optional[int] = None
    feature_names: Optional[List[str]] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    risk_bands: Optional[Dict[str, str]] = None
    input_schema: Optional[Dict[str, Any]] = None
    explainability: Optional[str] = None
    unavailable_reason: Optional[str] = None

