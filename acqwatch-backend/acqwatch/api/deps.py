"""
FastAPI dependency injectors — application-level singletons for
the DataRepository and model adapter.
"""

from __future__ import annotations

from functools import lru_cache
from typing import Annotated

from fastapi import Depends

from acqwatch.config import get_settings
from acqwatch.data.repository import DataRepository
from acqwatch.model.loader import load_model_adapter

_repo: DataRepository | None = None


def get_adapter():
    cfg = get_settings()
    return load_model_adapter(
        model_path=str(cfg.model_path_resolved),
        db_path=str(cfg.db_path_resolved),
        existing_src_path=str(cfg.existing_src_path_resolved),
    )


def get_repository() -> DataRepository:
    global _repo
    if _repo is None:
        cfg = get_settings()
        adapter = get_adapter()
        _repo = DataRepository(
            db_path=str(cfg.db_path_resolved),
            adapter=adapter,
        )
        _repo.load()
    return _repo
