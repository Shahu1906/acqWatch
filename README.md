# AcqWatch

AcqWatch is a web application for exploring infrastructure project progress and analyzing land-acquisition delay risk. It combines a React dashboard with a FastAPI backend, a SQLite project dataset, and a Gradient Boosting model.

## Features

- Dashboard summaries and project filtering/search
- Project explorer, project details, and state-level risk map
- Delay-risk predictions for the available project dataset
- Model status and explainability endpoints
- FastAPI-generated interactive API documentation

The current SQLite dataset contains 1,477 projects. Map locations are state-level centroids, not precise project coordinates. Risk predictions depend on the included model artifact and its feature-processing code.

## Project structure

```text
.
|-- acqwatch-backend/
|   |-- acqwatch/       # FastAPI application
|   |-- data/           # SQLite dataset
|   |-- models/         # Trained model artifacts
|   |-- src/            # Model feature, risk, and explainability code
|   `-- tests/          # Backend tests
`-- frontend/           # React, TypeScript, and Vite application
```

## Requirements

- Python 3.10 or later
- Node.js and npm

## Run locally

Open two terminals from the project root.

### 1. Start the backend

Windows PowerShell:

```powershell
cd .\acqwatch-backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn acqwatch.main:app --host 127.0.0.1 --port 8080 --reload
```

macOS/Linux:

```bash
cd acqwatch-backend
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
cp .env.example .env
uvicorn acqwatch.main:app --host 127.0.0.1 --port 8080 --reload
```

The backend `.env.example` uses local defaults:

- `DB_PATH=data/land_delays.db`
- `MODEL_PATH=models/gradient_boosting.joblib`
- `EXISTING_SRC_PATH=.`

Paths are resolved relative to `acqwatch-backend`. If these assets are moved, update the corresponding values in your local `.env`.

### 2. Start the frontend

In a second terminal:

```powershell
cd .\frontend
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The Vite development server proxies `/api` requests to `http://127.0.0.1:8080`. To change the backend URL, set `VITE_API_BASE_URL` in `frontend/.env`; see [frontend/.env.example](./frontend/.env.example).

### Check service status

- Backend health and dataset/model status: `http://127.0.0.1:8080/api/health`
- API documentation: `http://127.0.0.1:8080/docs`
- Model status: `http://127.0.0.1:8080/api/model/status`

The backend health endpoint reports whether the dataset/API is available. The model status is reported separately; model-dependent predictions and risk scores require the model artifact and `src` package.

## Tests and build

Backend tests:

```powershell
cd .\acqwatch-backend
python -m pytest -q
```

Frontend production build and lint:

```powershell
cd .\frontend
npm run build
npm run lint
```

## Main API endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Dataset and model availability |
| `GET` | `/api/metadata` | Dataset metadata and filter options |
| `GET` | `/api/overview` | Dashboard aggregates |
| `GET` | `/api/projects` | Searchable, filterable, paginated projects |
| `GET` | `/api/projects/{id}` | Project details |
| `GET` | `/api/projects/export` | Export filtered projects as CSV |
| `GET` | `/api/map/projects` | Project map features |
| `GET` | `/api/projects/{id}/prediction` | Prediction for a project |
| `POST` | `/api/predict` | Prediction for submitted project inputs |
| `GET` | `/api/projects/{id}/explanation` | Per-project explanation |
| `GET` | `/api/model/explanation` | Global model feature importance |
| `GET` | `/api/model/status` | Model identity, availability, and input schema |

See `/docs` for request and response schemas.

## Preparing a GitHub repository

Keep local `.env` files and credentials out of Git. The root `.gitignore` excludes local environment files, dependency folders, generated build output, caches, and common editor files. The `.env.example` files are intended to be committed.

The backend requires the SQLite database, model artifact, and `src` package to run with the included data/model configuration. Include these runtime assets in the repository or document another reliable way to obtain them. Do not include unrelated virtual environments, `node_modules`, or generated frontend build output.
