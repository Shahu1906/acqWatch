"""
pytest conftest.py - shared fixtures for AcqWatch backend tests.
All tests use the REAL dataset and REAL model artifacts.
A clearly isolated synthetic fixture is provided for unit-testing mechanics ONLY
and must never contaminate or replace the real project dataset.
"""
import sys
import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Resolve paths accurately:
# __file__ is in acqwatch-backend/tests/conftest.py
TESTS_DIR = Path(__file__).resolve().parent
BACKEND_DIR = TESTS_DIR.parent
WORKSPACE_ROOT = BACKEND_DIR.parent
EXISTING_SRC = BACKEND_DIR
DB_PATH = BACKEND_DIR / "data" / "land_delays.db"
MODEL_PATH = BACKEND_DIR / "models" / "gradient_boosting.joblib"

# Inject paths
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))
if str(EXISTING_SRC) not in sys.path:
    sys.path.insert(0, str(EXISTING_SRC))

# Set env vars BEFORE loading acqwatch
os.environ["DB_PATH"] = str(DB_PATH)
os.environ["MODEL_PATH"] = str(MODEL_PATH)
os.environ["EXISTING_SRC_PATH"] = str(EXISTING_SRC)
os.environ["ALLOWED_ORIGINS"] = "*"


@pytest.fixture(scope="session")
def client():
    """Real test client using live dataset and model (loaded once per session)."""
    # Reset singletons so env vars take effect
    import acqwatch.config as config
    import acqwatch.api.deps as deps
    import acqwatch.model.loader as loader
    config._settings = None
    deps._repo = None
    loader._adapter = None

    from acqwatch.main import app
    with TestClient(app) as c:
        yield c


@pytest.fixture(scope="session")
def first_project_code(client):
    """Returns the project_code of the top-ranked project from the real dataset."""
    resp = client.get("/api/projects?page=1&page_size=1&sort_by=risk_score&sort_order=desc")
    assert resp.status_code == 200
    data = resp.json()
    items = data.get("items", [])
    if items:
        return items[0]["project_code"]
    return "UNKNOWN"


# Isolated synthetic fixture (unit-test mechanics only)
import pandas as pd

SYNTHETIC_PROJECTS = pd.DataFrame([
    {
        "project_code": "SYNTHETIC_001",
        "project_name": "Test Road Project",
        "sector": "ROAD TRANSPORT AND HIGHWAYS",
        "agency": "NHAI",
        "state": "MAHARASHTRA",
        "orig_cost_cr": 500.0,
        "approval_date": "2020-04-01",
        "orig_commissioning_date": "2023-04-01",
        "delay_months": 12,
        "is_delayed": 1,
        "source_dataset": "SYNTHETIC_TEST_ONLY",
    },
    {
        "project_code": "SYNTHETIC_002",
        "project_name": "Test Power Project",
        "sector": "POWER",
        "agency": "PGCIL",
        "state": "GUJARAT",
        "orig_cost_cr": 200.0,
        "approval_date": "2019-01-01",
        "orig_commissioning_date": "2021-01-01",
        "delay_months": 0,
        "is_delayed": 0,
        "source_dataset": "SYNTHETIC_TEST_ONLY",
    },
])
