"""
GET /api/projects        — paginated, filtered, sorted project list
GET /api/projects/export — CSV export
GET /api/projects/{id}   — full project detail
"""
from __future__ import annotations

import io
import math
from typing import Any, Dict, List, Optional

import pandas as pd
from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import StreamingResponse

from acqwatch.api.deps import get_adapter, get_repository
from acqwatch.api.schemas import ProjectDetail, ProjectListResponse, ProjectSummary
from acqwatch.config import get_settings

router = APIRouter(prefix="/api", tags=["Projects"])


def _safe_float(val) -> Optional[float]:
    try:
        v = float(val)
        return None if pd.isna(v) else v
    except (TypeError, ValueError):
        return None


def _safe_int(val) -> Optional[int]:
    try:
        v = float(val)
        return None if pd.isna(v) else int(v)
    except (TypeError, ValueError):
        return None


def _to_summary(r: Dict[str, Any]) -> ProjectSummary:
    return ProjectSummary(
        project_code=str(r["project_code"]),
        project_name=str(r["project_name"]),
        sector=str(r["sector"]),
        agency=str(r["agency"]),
        state=str(r["state"]),
        orig_cost_cr=_safe_float(r.get("orig_cost_cr")),
        approval_date=r.get("approval_date"),
        orig_commissioning_date=r.get("orig_commissioning_date"),
        ant_commissioning_date=r.get("ant_commissioning_date"),
        delay_months=_safe_int(r.get("delay_months")),
        is_delayed=_safe_int(r.get("is_delayed")),
        risk_score=_safe_int(r.get("risk_score")),
        risk_category=r.get("risk_category"),
        badge_color=r.get("badge_color"),
    )


@router.get(
    "/projects/export",
    summary="Export filtered projects as CSV",
    response_class=StreamingResponse,
)
def export_projects(
    state: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    risk_category: Optional[str] = Query(None),
    agency: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
):
    """
    Exports the currently filtered project results as a CSV file.
    Capped at MAX_EXPORT_ROWS (default 5,000). Safe field selection only.
    """
    cfg = get_settings()
    repo = get_repository()
    csv_text = repo.export_csv(
        state=state,
        sector=sector,
        risk_category=risk_category,
        agency=agency,
        search=search,
        max_rows=cfg.max_export_rows,
    )
    return StreamingResponse(
        io.StringIO(csv_text),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=acqwatch_projects.csv"},
    )


@router.get("/projects", response_model=ProjectListResponse, summary="List projects")
def list_projects(
    search: Optional[str] = Query(None, description="Search project code, name, or agency"),
    state: Optional[str] = Query(None),
    sector: Optional[str] = Query(None),
    district: Optional[str] = Query(None, description="Not in source data — ignored"),
    risk_category: Optional[str] = Query(None, description="LOW | MEDIUM | HIGH | CRITICAL"),
    project_type: Optional[str] = Query(None, description="Not in source data — ignored"),
    agency: Optional[str] = Query(None),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=500),
    sort_by: str = Query("risk_score", description="Field to sort by"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
):
    """
    Returns paginated, filterable, sortable project list.
    `district` and `project_type` are accepted but noted as absent from the source dataset.
    Filtering and sorting operate across the complete dataset, not just the current page.
    """
    repo = get_repository()
    total, records = repo.query_projects(
        search=search,
        state=state,
        sector=sector,
        risk_category=risk_category,
        agency=agency,
        page=page,
        page_size=page_size,
        sort_by=sort_by,
        sort_order=sort_order,
    )
    total_pages = max(1, math.ceil(total / page_size))
    items = [_to_summary(r) for r in records]
    return ProjectListResponse(
        items=items,
        page=page,
        page_size=page_size,
        total=total,
        total_pages=total_pages,
    )


@router.get("/projects/{project_id}", response_model=ProjectDetail, summary="Project detail")
def project_detail(project_id: str):
    """
    Returns the full available record for a project.
    Returns 404 for unknown project IDs.
    Fields absent in the source data are null — never invented.
    """
    repo = get_repository()
    adapter = get_adapter()
    row = repo.get_project(project_id)
    if row is None:
        raise HTTPException(
            status_code=404,
            detail=f"Project '{project_id}' not found in the verified project inventory.",
        )

    geo = repo.get_state_coords(str(row["state"]))
    risk_score = _safe_int(row.get("risk_score"))
    risk_prob = _safe_float(row.get("risk_probability"))
    pred_available = risk_score is not None

    return ProjectDetail(
        project_code=str(row["project_code"]),
        project_name=str(row["project_name"]),
        sector=str(row["sector"]),
        agency=str(row["agency"]),
        state=str(row["state"]),
        approval_date=row.get("approval_date"),
        orig_commissioning_date=row.get("orig_commissioning_date"),
        rev_commissioning_date=row.get("rev_commissioning_date") if pd.notna(row.get("rev_commissioning_date")) else None,
        ant_commissioning_date=row.get("ant_commissioning_date"),
        orig_cost_cr=_safe_float(row.get("orig_cost_cr")),
        rev_cost_cr=_safe_float(row.get("rev_cost_cr")),
        ant_cost_cr=_safe_float(row.get("ant_cost_cr")),
        cumulative_exp_cr=_safe_float(row.get("cumulative_exp_cr")),
        physical_progress_pct=_safe_float(row.get("physical_progress_pct")),
        delay_months=_safe_int(row.get("delay_months")),
        is_delayed=_safe_int(row.get("is_delayed")),
        cost_overrun_pct=_safe_float(row.get("cost_overrun_pct")),
        expenditure_ratio=_safe_float(row.get("expenditure_ratio")),
        source_dataset=row.get("source_dataset"),
        risk_score=risk_score,
        risk_category=row.get("risk_category"),
        badge_color=row.get("badge_color"),
        risk_probability=risk_prob,
        latitude=geo["lat"],
        longitude=geo["lng"],
        geo_precision=geo["precision"],
        prediction_available=pred_available,
        prediction_source="precomputed" if pred_available else None,
    )
