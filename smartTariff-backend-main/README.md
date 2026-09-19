# SmartTariff — Active ML Model Artifact Storage

> [!NOTE]
> **LEGACY FASTAPI BACKEND DECOMMISSIONED**:
> The legacy Python FastAPI backend, its routers/models/schemas, and the SQLite database (`smarttariff.db`) have been officially decommissioned and archived.
> 
> The full legacy codebase, SQLite database, and rollback runbook are preserved offline in:
> - `archives/legacy-fastapi-sqlite-archive/`
> - `archives/legacy_fastapi_sqlite_archive_20260919.zip`

---

## Active ML Model Artifacts

This directory is strictly preserved to house the active SmartTariff V4.3 Random Forest recommendation model artifacts:

1. **`smarttariff_v4_3_random_forest.pkl`** (8,651,358 bytes)
   - **Type**: Scikit-Learn `RandomForestRegressor`
   - **SHA256**: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43`
   - **Status**: Active, loaded by `ml-service/` (Port 8000).

2. **`smarttariff_v4_3_config.json`** (7,263 bytes)
   - **Description**: Model feature metadata and plan configuration.
   - **Status**: Active, referenced by `ml-service/` and `backend-node/`.

---

## Primary Application Stack

- **Frontend**: React 19 + Vite 7 (`smartTariff-frontend-main/`)
- **Backend API**: Node.js + Express + Prisma ORM (`backend-node/`, Port 5000)
- **Database**: PostgreSQL (Neon Cloud)
- **ML Microservice**: Python FastAPI Inference Service (`ml-service/`, Port 8000)
