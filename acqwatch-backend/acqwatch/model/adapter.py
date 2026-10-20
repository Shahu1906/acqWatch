"""
ModelAdapter — Replaceable inference interface for the AcqWatch delay-risk model.

To swap the model in a future release:
  1. Create a new class that inherits ModelAdapterBase.
  2. Implement predict_proba(), explain(), is_available, feature_names, model_id.
  3. Register the new adapter in loader.py.

STRICT RULE: Never retrain, fabricate probabilities, or modify model artifacts here.
"""

from __future__ import annotations

import logging
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Optional, Protocol, runtime_checkable

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)


@dataclass
class ExplanationPayload:
    """Structured output of per-project SHAP explanation."""
    top_risk_drivers: List[Dict[str, Any]]
    top_mitigating_factors: List[Dict[str, Any]]
    base_log_odds: float
    disclaimer: str
    available: bool = True
    unavailable_reason: Optional[str] = None


@dataclass
class PredictionPayload:
    """Output of a single-project prediction."""
    project_code: str
    probability: float
    risk_score: int
    risk_category: str
    badge_color: str
    badge_label: str
    description: str
    model_id: str
    prediction_source: str  # "precomputed" | "fresh"
    available: bool = True
    unavailable_reason: Optional[str] = None


@runtime_checkable
class ModelAdapterBase(Protocol):
    """
    Minimal interface every model adapter must satisfy.
    Swap the model by providing a new implementation of this protocol.
    """

    @property
    def is_available(self) -> bool: ...

    @property
    def model_id(self) -> str: ...

    @property
    def feature_names(self) -> List[str]: ...

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        """Return P(delay=1) for each row in df."""
        ...

    def explain(self, df: pd.DataFrame, top_k: int = 4) -> ExplanationPayload:
        """Return per-project SHAP explanation for a single-row df."""
        ...

    def global_importance(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Return global mean-abs-SHAP feature importances."""
        ...

    def get_status(self) -> Dict[str, Any]:
        """Return model status dict for /api/model/status."""
        ...


class UnavailableModelAdapter:
    """
    Returned when the model artifact is missing or fails to load.
    Every method returns a structured unavailable status — no fabricated outputs.
    """

    def __init__(self, reason: str):
        self._reason = reason

    @property
    def is_available(self) -> bool:
        return False

    @property
    def model_id(self) -> str:
        return "unavailable"

    @property
    def feature_names(self) -> List[str]:
        return []

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        raise RuntimeError(f"Model unavailable: {self._reason}")

    def explain(self, df: pd.DataFrame, top_k: int = 4) -> ExplanationPayload:
        return ExplanationPayload(
            top_risk_drivers=[],
            top_mitigating_factors=[],
            base_log_odds=0.0,
            disclaimer="",
            available=False,
            unavailable_reason=self._reason
        )

    def global_importance(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        return []

    def get_status(self) -> Dict[str, Any]:
        return {
            "available": False,
            "model_id": "unavailable",
            "unavailable_reason": self._reason,
            "feature_names": [],
            "input_schema": None
        }


class GradientBoostingAdapter:
    """
    Wraps the existing GradientBoostingDelayModel, FeaturePipeline, and RiskEngine.
    Loaded once at startup. Never retrained or modified.
    """

    def __init__(
        self,
        model: Any,
        pipeline: Any,
        xai_engine: Any,
        risk_engine: Any,
        band_definitions: Dict[str, Any],
        model_path: str
    ):
        self._model = model
        self._pipeline = pipeline
        self._xai = xai_engine
        self._risk = risk_engine
        self._bands = band_definitions
        self._model_path = model_path
        self._model_id = f"gradient_boosting_v1:{Path(model_path).stem}"

    @property
    def is_available(self) -> bool:
        return True

    @property
    def model_id(self) -> str:
        return self._model_id

    @property
    def feature_names(self) -> List[str]:
        return list(self._pipeline.feature_names)

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        X = self._pipeline.transform(df)
        return self._model.predict_proba(X)

    def explain(self, df: pd.DataFrame, top_k: int = 4) -> ExplanationPayload:
        import numpy as np
        X = self._pipeline.transform(df)
        meta = {}
        result = self._xai.explain_project(X, meta, top_k=top_k)
        return ExplanationPayload(
            top_risk_drivers=result["top_risk_drivers"],
            top_mitigating_factors=result["top_mitigating_factors"],
            base_log_odds=result["base_log_odds"],
            disclaimer=result["disclaimer"],
            available=True
        )

    def global_importance(self, df: pd.DataFrame) -> List[Dict[str, Any]]:
        X = self._pipeline.transform(df)
        importance_df = self._xai.compute_global_importance(X)
        return importance_df.to_dict(orient="records")

    def get_status(self) -> Dict[str, Any]:
        params = {}
        try:
            clf = self._model.model
            params = {
                "n_estimators": clf.n_estimators,
                "learning_rate": clf.learning_rate,
                "max_depth": clf.max_depth,
            }
        except Exception:
            pass
        return {
            "available": True,
            "model_id": self._model_id,
            "model_type": "GradientBoostingClassifier",
            "framework": "scikit-learn",
            "artifact_path": str(Path(self._model_path).name),
            "feature_count": len(self.feature_names),
            "feature_names": self.feature_names,
            "hyperparameters": params,
            "risk_bands": {
                "LOW": "score 0-30",
                "MEDIUM": "score 31-60",
                "HIGH": "score 61-80",
                "CRITICAL": "score 81-100"
            },
            "input_schema": {
                "required_columns": [
                    "orig_cost_cr", "sector", "agency", "state",
                    "approval_date", "orig_commissioning_date"
                ],
                "note": "All features must be knowable at project approval time (no post-hoc leakage)"
            },
            "explainability": "SHAP TreeExplainer (genuine per-project values)",
            "unavailable_reason": None
        }
