"""
ModelLoader — Loads existing model artifacts at application startup.
If artifacts are missing, returns UnavailableModelAdapter with a clear reason.
STRICT RULE: Never fabricate a model or generate random predictions.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path
from typing import Optional

from acqwatch.model.adapter import (
    GradientBoostingAdapter,
    UnavailableModelAdapter,
)

logger = logging.getLogger(__name__)

_adapter = None  # module-level singleton


def load_model_adapter(
    model_path: str,
    db_path: str,
    existing_src_path: str
) -> GradientBoostingAdapter | UnavailableModelAdapter:
    """
    Loads the Gradient Boosting model artifact and FeaturePipeline from the
    existing repository. Returns UnavailableModelAdapter if anything is missing.
    """
    global _adapter
    if _adapter is not None:
        return _adapter

    src = Path(existing_src_path)
    if not src.exists():
        reason = f"existing_src_path not found: {existing_src_path}"
        logger.error(reason)
        _adapter = UnavailableModelAdapter(reason)
        return _adapter

    # Inject the existing src/ into sys.path so we can import its modules
    src_str = str(src)
    if src_str not in sys.path:
        sys.path.insert(0, src_str)

    # Verify model artifact
    mp = Path(model_path)
    if not mp.exists():
        reason = f"Model artifact not found: {model_path}"
        logger.error(reason)
        _adapter = UnavailableModelAdapter(reason)
        return _adapter

    # Verify database
    db = Path(db_path)
    if not db.exists():
        reason = f"SQLite database not found: {db_path}"
        logger.error(reason)
        _adapter = UnavailableModelAdapter(reason)
        return _adapter

    try:
        from src.modeling.ensemble import GradientBoostingDelayModel
        from src.modeling.features import FeaturePipeline
        from src.modeling.risk_engine import RiskEngine, BAND_DEFINITIONS
        from src.modeling.explainability import ProjectExplainabilityEngine
        from src.modeling.split import load_projects_from_db, create_project_splits

        logger.info("Loading project dataset from %s", db_path)
        df = load_projects_from_db(db_path)
        logger.info("Loaded %d projects. Fitting FeaturePipeline on train split.", len(df))

        train_df, _, _ = create_project_splits(df, random_state=42)
        pipeline = FeaturePipeline().fit(train_df)

        logger.info("Loading model artifact from %s", model_path)
        model = GradientBoostingDelayModel.load(model_path)

        risk_engine = RiskEngine()
        xai_engine = ProjectExplainabilityEngine(model, pipeline.feature_names)

        _adapter = GradientBoostingAdapter(
            model=model,
            pipeline=pipeline,
            xai_engine=xai_engine,
            risk_engine=risk_engine,
            band_definitions=BAND_DEFINITIONS,
            model_path=model_path
        )
        logger.info("Model adapter ready. Model ID: %s", _adapter.model_id)
        return _adapter

    except Exception as exc:
        reason = f"Failed to load model/pipeline: {exc}"
        logger.exception(reason)
        _adapter = UnavailableModelAdapter(reason)
        return _adapter
