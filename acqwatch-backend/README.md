
# AcqWatch — Python FastAPI Backend for Land Acquisition Risk Intelligence

## Repository Audit Summary

| Item | Verified Finding |
|---|---|
| Dataset location | ../Predictive-Analytics-System.../data/land_delays.db (SQLite) |
| **Verified project count** | **1,477 unique projects** (not 14,407 — prompt figure was unverified) |
| Source dataset | MoSPI_Flash_Report_Feb2025 |
| Project identifier | project_code (TEXT PRIMARY KEY) |
| Location fields | State-level centroids only (no precise GPS) |
| Risk categories stored in DB | None — computed dynamically from model |
| Risk categories emitted | LOW / MEDIUM / HIGH / CRITICAL |
| Thresholds | score 0-30=LOW, 31-60=MEDIUM, 61-80=HIGH, 81-100=CRITICAL |
| ML model | gradient_boosting.joblib (sklearn GradientBoostingClassifier) |
| Feature pipeline | FeaturePipeline — target-encodes agency/state, one-hot sectors, log-cost, dates (20 features) |
| Explainability | SHAP TreeExplainer (genuine per-project values) |
| Prediction storage | Not in DB — precomputed in-memory at startup |
| Delayed distribution | 962 delayed (65.1%), 515 on-time (34.9%) |
| Sectors | 10 unique sectors |
| States | 29 states/UTs |

## Quick Start

`ash
pip install -r requirements.txt
cp .env.example .env
uvicorn acqwatch.main:app --host 127.0.0.1 --port 8080 --reload
pytest tests/ -v
`

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | /api/health | App + dataset + model health |
| GET | /api/metadata | Counts, categories, states, filters, model info |
| GET | /api/overview | Dashboard KPIs (filterable) |
| GET | /api/projects | Paginated project list with filters/sort |
| GET | /api/projects/export | CSV export (filtered, max 5000) |
| GET | /api/projects/{id} | Full project detail |
| GET | /api/map/projects | GeoJSON features for map |
| GET | /api/projects/{id}/prediction | Stored model prediction |
| POST | /api/predict | Ad-hoc prediction for custom inputs |
| GET | /api/projects/{id}/explanation | Per-project SHAP explanation |
| GET | /api/model/explanation | Global feature importance |
| GET | /api/filters | Available filter option values |
| GET | /api/model/status | Model availability and schema |

## Future Model Replacement

Replace ModelAdapter in acqwatch/model/adapter.py. No router or schema changes needed.
