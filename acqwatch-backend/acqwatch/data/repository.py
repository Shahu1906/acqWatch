"""
DataRepository — Single source of truth for all 1,477 verified projects.

Loads from the existing SQLite database, precomputes risk classifications using
the existing model, and exposes efficient filtered/paginated views.

STRICT RULES:
- Never fabricate project records or synthetic data.
- Never invent coordinates (state-level centroids are used, explicitly labeled).
- Preserve all original field values; NaN/None stays NaN/None.
- Risk categories are computed from the existing model, never hardcoded.
"""

from __future__ import annotations

import logging
import sqlite3
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# Official administrative centroids — explicitly labeled as state-level only
STATE_CENTROIDS: Dict[str, Dict[str, Any]] = {
    "ANDAMAN AND NICOBAR ISLANDS": {"lat": 11.7401, "lng": 92.6586, "precision": "State-level centroid"},
    "ANDHRA PRADESH": {"lat": 15.9129, "lng": 79.7400, "precision": "State-level centroid"},
    "ARUNACHAL PRADESH": {"lat": 28.2180, "lng": 94.7278, "precision": "State-level centroid"},
    "ASSAM": {"lat": 26.2006, "lng": 92.9376, "precision": "State-level centroid"},
    "BIHAR": {"lat": 25.0961, "lng": 85.3131, "precision": "State-level centroid"},
    "CHHATTISGARH": {"lat": 21.2787, "lng": 81.8661, "precision": "State-level centroid"},
    "DELHI": {"lat": 28.7041, "lng": 77.1025, "precision": "State-level centroid"},
    "GOA": {"lat": 15.2993, "lng": 74.1240, "precision": "State-level centroid"},
    "GUJARAT": {"lat": 22.2587, "lng": 71.1924, "precision": "State-level centroid"},
    "HARYANA": {"lat": 29.0588, "lng": 76.0856, "precision": "State-level centroid"},
    "HIMACHAL PRADESH": {"lat": 31.1048, "lng": 77.1734, "precision": "State-level centroid"},
    "JAMMU AND KASHMIR": {"lat": 33.7782, "lng": 76.5762, "precision": "State-level centroid"},
    "JHARKHAND": {"lat": 23.6102, "lng": 85.2799, "precision": "State-level centroid"},
    "KARNATAKA": {"lat": 15.3173, "lng": 75.7139, "precision": "State-level centroid"},
    "KERALA": {"lat": 10.8505, "lng": 76.2711, "precision": "State-level centroid"},
    "LADAKH": {"lat": 34.1526, "lng": 77.5771, "precision": "State-level centroid"},
    "MADHYA PRADESH": {"lat": 22.9734, "lng": 78.6569, "precision": "State-level centroid"},
    "MAHARASHTRA": {"lat": 19.7515, "lng": 75.7139, "precision": "State-level centroid"},
    "MANIPUR": {"lat": 24.6637, "lng": 93.9063, "precision": "State-level centroid"},
    "MEGHALAYA": {"lat": 25.4670, "lng": 91.3662, "precision": "State-level centroid"},
    "MIZORAM": {"lat": 23.1645, "lng": 92.9376, "precision": "State-level centroid"},
    "MULTI STATE": {"lat": 20.5937, "lng": 78.9629, "precision": "National centroid (Multi-State)"},
    "NAGALAND": {"lat": 26.1584, "lng": 94.5624, "precision": "State-level centroid"},
    "ODISHA": {"lat": 20.9517, "lng": 85.0985, "precision": "State-level centroid"},
    "PUNJAB": {"lat": 31.1471, "lng": 75.3412, "precision": "State-level centroid"},
    "RAJASTHAN": {"lat": 27.0238, "lng": 74.2179, "precision": "State-level centroid"},
    "SIKKIM": {"lat": 27.5330, "lng": 88.5122, "precision": "State-level centroid"},
    "TAMIL NADU": {"lat": 11.1271, "lng": 78.6569, "precision": "State-level centroid"},
    "TELANGANA": {"lat": 18.1124, "lng": 79.0193, "precision": "State-level centroid"},
    "TRIPURA": {"lat": 23.9408, "lng": 91.9882, "precision": "State-level centroid"},
    "UTTAR PRADESH": {"lat": 26.8467, "lng": 80.9462, "precision": "State-level centroid"},
    "UTTARAKHAND": {"lat": 30.0668, "lng": 79.0193, "precision": "State-level centroid"},
    "WEST BENGAL": {"lat": 22.9868, "lng": 87.8550, "precision": "State-level centroid"},
}

_FALLBACK_CENTROID = {"lat": 20.5937, "lng": 78.9629, "precision": "National centroid (Fallback)"}

VALID_SORT_FIELDS = {
    "project_code", "project_name", "sector", "agency", "state",
    "orig_cost_cr", "delay_months", "risk_score", "approval_date",
    "orig_commissioning_date", "is_delayed"
}


class DataRepository:
    """
    In-memory indexed project store.
    Built once at startup; safe for concurrent reads.
    """

    def __init__(self, db_path: str, adapter):
        self._db_path = db_path
        self._adapter = adapter
        self.df: pd.DataFrame = pd.DataFrame()
        self._lookup: Dict[str, Dict[str, Any]] = {}
        self._loaded = False
        self._load_timestamp: Optional[str] = None

    def load(self):
        """Load projects from DB and precompute risk classifications."""
        logger.info("Loading projects from %s", self._db_path)
        conn = sqlite3.connect(self._db_path)
        query = """
        SELECT
            project_code, project_name, sector, agency, state,
            approval_date, orig_commissioning_date, rev_commissioning_date,
            ant_commissioning_date, orig_cost_cr, rev_cost_cr, ant_cost_cr,
            cumulative_exp_cr, physical_progress_pct, delay_months,
            is_delayed, cost_overrun_pct, expenditure_ratio, source_dataset
        FROM projects
        """
        self.df = pd.read_sql_query(query, conn)
        conn.close()

        total = len(self.df)
        unique = self.df["project_code"].nunique()
        logger.info("Loaded %d rows, %d unique project_codes.", total, unique)
        if total != unique:
            logger.warning("DUPLICATE project_codes detected: %d rows vs %d unique codes", total, unique)

        # Precompute risk if model is available
        if self._adapter.is_available:
            self._precompute_risks()
        else:
            logger.warning("Model unavailable — risk fields will be null.")
            self.df["risk_probability"] = np.nan
            self.df["risk_score"] = np.nan
            self.df["risk_category"] = None
            self.df["badge_color"] = None

        # Build lookup dict
        self._lookup = {}
        for _, row in self.df.iterrows():
            self._lookup[str(row["project_code"]).strip().upper()] = row.to_dict()

        self._loaded = True
        self._load_timestamp = datetime.now(timezone.utc).isoformat()
        logger.info("DataRepository ready. %d projects indexed.", len(self._lookup))

    def _precompute_risks(self):
        """Precompute risk probability, score, and band for all projects at startup."""
        import sys
        src_path = str(Path(self._db_path).parent.parent)
        if src_path not in sys.path:
            sys.path.insert(0, src_path)
        try:
            from src.modeling.risk_engine import RiskEngine, BAND_DEFINITIONS
        except ImportError:
            logger.error("Cannot import RiskEngine — risk classification skipped.")
            self.df["risk_probability"] = np.nan
            self.df["risk_score"] = np.nan
            self.df["risk_category"] = None
            self.df["badge_color"] = None
            return

        probs = self._adapter.predict_proba(self.df)
        risk_engine = RiskEngine()
        scores = [risk_engine.score_probability(float(p)) for p in probs]
        bands = [risk_engine.classify_score(s) for s in scores]
        colors = [BAND_DEFINITIONS[b]["color"] for b in bands]

        self.df["risk_probability"] = probs
        self.df["risk_score"] = scores
        self.df["risk_category"] = bands
        self.df["badge_color"] = colors

    # ── Public queries ────────────────────────────────────────────────────────

    @property
    def total_projects(self) -> int:
        return len(self.df)

    @property
    def load_timestamp(self) -> Optional[str]:
        return self._load_timestamp

    def get_project(self, project_code: str) -> Optional[Dict[str, Any]]:
        key = str(project_code).strip().upper()
        return self._lookup.get(key)

    def get_state_coords(self, state: str) -> Dict[str, Any]:
        return STATE_CENTROIDS.get(str(state).strip().upper(), _FALLBACK_CENTROID)

    def query_projects(
        self,
        search: Optional[str] = None,
        state: Optional[str] = None,
        sector: Optional[str] = None,
        risk_category: Optional[str] = None,
        project_type: Optional[str] = None,
        agency: Optional[str] = None,
        page: int = 1,
        page_size: int = 50,
        sort_by: str = "risk_score",
        sort_order: str = "desc"
    ) -> Tuple[int, List[Dict[str, Any]]]:
        """Filter, sort, and paginate projects. Returns (total_matching, page_records)."""
        filtered = self.df.copy()

        if search and search.strip():
            term = search.strip().lower()
            mask = (
                filtered["project_code"].str.lower().str.contains(term, na=False)
                | filtered["project_name"].str.lower().str.contains(term, na=False)
                | filtered["agency"].str.lower().str.contains(term, na=False)
            )
            filtered = filtered[mask]

        if state and state.strip():
            filtered = filtered[filtered["state"].str.upper() == state.strip().upper()]

        if sector and sector.strip():
            filtered = filtered[filtered["sector"].str.upper() == sector.strip().upper()]

        if risk_category and risk_category.strip():
            if filtered["risk_category"].notna().any():
                filtered = filtered[filtered["risk_category"].str.upper() == risk_category.strip().upper()]

        if agency and agency.strip():
            filtered = filtered[filtered["agency"].str.upper() == agency.strip().upper()]

        # Sort
        safe_sort = sort_by if sort_by in VALID_SORT_FIELDS else "risk_score"
        ascending = sort_order.lower() != "desc"
        if safe_sort in filtered.columns:
            filtered = filtered.sort_values(by=safe_sort, ascending=ascending, na_position="last")

        total = len(filtered)
        page_size = min(max(1, page_size), 500)
        start = (page - 1) * page_size
        end = start + page_size
        records = filtered.iloc[start:end].to_dict(orient="records")
        return total, records

    def get_overview(
        self,
        state: Optional[str] = None,
        sector: Optional[str] = None,
        risk_category: Optional[str] = None,
        agency: Optional[str] = None
    ) -> Dict[str, Any]:
        """Compute dashboard KPIs over filtered or full dataset."""
        all_total = len(self.df)
        filtered = self.df.copy()

        if state and state.strip():
            filtered = filtered[filtered["state"].str.upper() == state.strip().upper()]
        if sector and sector.strip():
            filtered = filtered[filtered["sector"].str.upper() == sector.strip().upper()]
        if risk_category and risk_category.strip():
            if filtered["risk_category"].notna().any():
                filtered = filtered[filtered["risk_category"].str.upper() == risk_category.strip().upper()]
        if agency and agency.strip():
            filtered = filtered[filtered["agency"].str.upper() == agency.strip().upper()]

        n = len(filtered)
        delayed = int((filtered["is_delayed"] == 1).sum())
        on_time = int((filtered["is_delayed"] == 0).sum())
        delay_rate = round((delayed / n) * 100.0, 2) if n > 0 else 0.0

        counts_by_risk: Dict[str, int] = {"LOW": 0, "MEDIUM": 0, "HIGH": 0, "CRITICAL": 0}
        if "risk_category" in filtered.columns and filtered["risk_category"].notna().any():
            for cat, cnt in filtered["risk_category"].value_counts().items():
                if str(cat) in counts_by_risk:
                    counts_by_risk[str(cat)] = int(cnt)

        pcts_by_risk = {
            cat: round((cnt / n) * 100.0, 2) if n > 0 else 0.0
            for cat, cnt in counts_by_risk.items()
        }

        # Sector distribution
        sector_counts = filtered["sector"].value_counts().to_dict()
        sector_dist = {str(k): int(v) for k, v in sector_counts.items()}

        # State distribution (top 10)
        state_counts = filtered["state"].value_counts().head(10).to_dict()
        state_dist = {str(k): int(v) for k, v in state_counts.items()}

        # Cost stats
        cost_series = filtered["orig_cost_cr"].dropna()
        cost_stats = {}
        if len(cost_series) > 0:
            cost_stats = {
                "total_sanctioned_cr": round(float(cost_series.sum()), 2),
                "avg_project_cost_cr": round(float(cost_series.mean()), 2),
                "max_project_cost_cr": round(float(cost_series.max()), 2),
            }

        predictions_available = bool(
            "risk_score" in filtered.columns and filtered["risk_score"].notna().any()
        )

        return {
            "total_projects_in_inventory": all_total,
            "matching_projects": n,
            "filters_applied": bool(state or sector or risk_category or agency),
            "delayed_count": delayed,
            "on_time_count": on_time,
            "delay_rate_pct": delay_rate,
            "counts_by_risk_category": counts_by_risk,
            "percentages_by_risk_category": pcts_by_risk,
            "sector_distribution": sector_dist,
            "state_distribution": state_dist,
            "cost_stats": cost_stats,
            "predictions_available": predictions_available,
            "dataset_last_loaded": self._load_timestamp,
        }

    def get_map_features(
        self,
        state: Optional[str] = None,
        sector: Optional[str] = None,
        risk_category: Optional[str] = None,
        bbox: Optional[Dict[str, float]] = None
    ) -> List[Dict[str, Any]]:
        """Build GeoJSON-compatible feature list for the map view."""
        filtered = self.df.copy()

        if state and state.strip():
            filtered = filtered[filtered["state"].str.upper() == state.strip().upper()]
        if sector and sector.strip():
            filtered = filtered[filtered["sector"].str.upper() == sector.strip().upper()]
        if risk_category and risk_category.strip():
            if filtered["risk_category"].notna().any():
                filtered = filtered[filtered["risk_category"].str.upper() == risk_category.strip().upper()]

        features = []
        for _, row in filtered.iterrows():
            geo = self.get_state_coords(str(row["state"]))
            lat, lng = geo["lat"], geo["lng"]

            # Bounding-box filter (applied after centroid resolution)
            if bbox:
                if not (bbox["south"] <= lat <= bbox["north"] and bbox["west"] <= lng <= bbox["east"]):
                    continue

            risk_score = int(row["risk_score"]) if pd.notna(row.get("risk_score")) else None
            risk_category_val = str(row["risk_category"]) if pd.notna(row.get("risk_category")) else None
            badge_color = str(row["badge_color"]) if pd.notna(row.get("badge_color")) else "#9CA3AF"

            features.append({
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [lng, lat]},
                "properties": {
                    "project_code": str(row["project_code"]),
                    "project_name": str(row["project_name"]),
                    "sector": str(row["sector"]),
                    "agency": str(row["agency"]),
                    "state": str(row["state"]),
                    "orig_cost_cr": float(row["orig_cost_cr"]) if pd.notna(row["orig_cost_cr"]) else None,
                    "delay_months": int(row["delay_months"]) if pd.notna(row.get("delay_months")) else None,
                    "risk_score": risk_score,
                    "risk_category": risk_category_val,
                    "badge_color": badge_color,
                    "geo_precision": geo["precision"],
                    "is_delayed": int(row["is_delayed"]) if pd.notna(row.get("is_delayed")) else None,
                },
            })
        return features

    def get_filter_options(self) -> Dict[str, Any]:
        """Return available distinct values for all filter fields."""
        return {
            "states": sorted(self.df["state"].dropna().unique().tolist()),
            "sectors": sorted(self.df["sector"].dropna().unique().tolist()),
            "agencies": sorted(self.df["agency"].dropna().unique().tolist()),
            "risk_categories": ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
            "sort_fields": sorted(VALID_SORT_FIELDS),
        }

    def export_csv(
        self,
        state: Optional[str] = None,
        sector: Optional[str] = None,
        risk_category: Optional[str] = None,
        agency: Optional[str] = None,
        search: Optional[str] = None,
        max_rows: int = 5000
    ) -> str:
        """Return filtered dataset as CSV string. Never exposes internal paths or system metadata."""
        _, records = self.query_projects(
            search=search, state=state, sector=sector,
            risk_category=risk_category, agency=agency,
            page=1, page_size=max_rows, sort_by="risk_score", sort_order="desc"
        )
        safe_cols = [
            "project_code", "project_name", "sector", "agency", "state",
            "orig_cost_cr", "approval_date", "orig_commissioning_date",
            "delay_months", "is_delayed", "cost_overrun_pct",
            "risk_score", "risk_category"
        ]
        rows = []
        for r in records:
            rows.append({c: r.get(c) for c in safe_cols})
        return pd.DataFrame(rows).to_csv(index=False)
