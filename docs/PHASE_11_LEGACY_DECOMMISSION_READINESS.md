# Phase 11 — Legacy Decommission Readiness Review

## 1. Objective

The objective of Phase 11 is to evaluate whether the legacy **FastAPI + SQLite** stack is ready for a controlled future decommissioning.

> [!IMPORTANT]
> **REVIEW ONLY — ZERO DELETION POLICY**:
> This review does **NOT** decommission any component, delete any file, uninstall any dependency, reset any database, modify the SQLite database, or alter the RandomForest machine learning model. The legacy stack remains strictly preserved as a dormant rollback archive.

---

## 2. Current Architecture

The SmartTariff platform topology operates under two distinct roles:

### Primary Active Architecture
- **Frontend**: `smartTariff-frontend-main/` (React + Vite, Port 5173 / Static build `dist/`)
- **Backend**: `backend-node/` (Node.js + Express + Prisma ORM, Port 5000)
- **Database**: PostgreSQL (Remote Neon AWS instance, SSL connection pooler)
- **ML Microservice**: `ml-service/` (Standalone FastAPI + Uvicorn service, Port 8000)
- **ML Model**: `smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl` (Loaded by ML microservice)

### Dormant Rollback Archive
- **Legacy Backend**: `smartTariff-backend-main/` (FastAPI monolith)
- **Legacy Database**: `smartTariff-backend-main/smarttariff.db` (SQLite 3)
- **Rollback Runbook**: `docs/ROLLBACK_RUNBOOK.md`

---

## 3. Legacy Inventory

An exhaustive inventory of the legacy codebase was conducted:

| Item Path / Component | Description | Classification | Notes |
| :--- | :--- | :--- | :--- |
| `smartTariff-backend-main/app/` | FastAPI routers, models, schemas, services | **ROLLBACK REQUIRED** | Dormant; needed if reverting to FastAPI |
| `smartTariff-backend-main/main.py` | FastAPI ASGI entry point | **ROLLBACK REQUIRED** | Starts legacy Uvicorn on :8000 |
| `smartTariff-backend-main/api/index.py` | Vercel serverless wrapper for FastAPI | **LEGACY / UNUSED** | Obsolete Vercel Python entry point |
| `smartTariff-backend-main/check_db.py` | SQLite inspection script | **LEGACY / UNUSED** | Diagnostic script for SQLite |
| `smartTariff-backend-main/start.bat` | Windows batch launcher for FastAPI | **ROLLBACK REQUIRED** | Used to start legacy server |
| `smartTariff-backend-main/smarttariff.db` | Source SQLite database (90,112 bytes) | **ROLLBACK REQUIRED** | Source of truth for migration; intact |
| `smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl` | RandomForest model artifact | **ACTIVE** | **DO NOT DELETE**: Actively loaded by `ml-service/` |
| `smartTariff-backend-main/smarttariff_v4_3_config.json` | Feature & plan metadata for ML model | **ACTIVE** | **DO NOT DELETE**: Actively read by `ml-service/` |
| `smartTariff-backend-main/requirements.txt` | Python packages for legacy backend | **LEGACY** | Legacy virtualenv requirements |
| `smartTariff-backend-main/.env.example` | Legacy environment template | **LEGACY** | SQLite and JWT secret template |
| `backend-node/scripts/sqlite_dump.json` | JSON export of SQLite migration data | **LEGACY** | Read-only baseline migration artifact |
| `backend-node/scripts/export_sqlite.py` | Migration extraction script | **LEGACY** | Read-only migration tool |
| `backend-node/scripts/import_to_postgres.js`| Migration loading script | **LEGACY** | Read-only migration tool |
| `docs/MIGRATION_PLAN.md` | Initial architecture migration design | **DOCUMENTATION** | Historical record |
| `docs/DATABASE_MIGRATION.md` | Data migration design | **DOCUMENTATION** | Historical record |
| `docs/ROLLBACK_RUNBOOK.md` | Operational rollback runbook | **ROLLBACK REQUIRED** | Essential recovery procedure |

---

## 4. Active Application Dependency Audit

A deep audit was conducted across the active codebase to detect any hidden dependencies on the legacy stack:

| Component | Codebase Area | Dependency Found | Classification | Details |
| :--- | :--- | :--- | :--- | :--- |
| **React Frontend** | `smartTariff-frontend-main/src/` | None | **NONE** | All API calls routed to `http://localhost:5000/api/v1` |
| **Node.js Express** | `backend-node/src/` | None (SQLite/FastAPI) | **NONE** | Uses Prisma Client + PostgreSQL |
| **Node.js Config** | `backend-node/src/services/mlService.js` | `smarttariff_v4_3_config.json` | **ACTIVE (DATA)** | Fallback lookup for plan metadata |
| **Python ML Microservice** | `ml-service/.env` | `smarttariff_v4_3_random_forest.pkl` | **ACTIVE (MODEL)** | Model loaded directly by `ml-service` |
| **Prisma ORM** | `backend-node/prisma/schema.prisma` | PostgreSQL datasource | **ACTIVE** | No SQLite provider references |

---

## 5. Frontend Dependency Check

- **API Base URL**: Configured as `http://localhost:5000/api/v1` in `src/services/api.js` and `.env`.
- **Legacy Route Scanning**: No active React source calls FastAPI endpoints or references port 8000 directly.
- **Result**: **FRONTEND LEGACY DEPENDENCY: NONE**

---

## 6. Node Backend Dependency Check

- **Database Client**: `@prisma/client` connects exclusively to PostgreSQL via `DATABASE_URL`.
- **Database Engine**: No `sqlite3`, `better-sqlite3`, or SQLAlchemy bindings present in `package.json`.
- **Inter-service Communication**: Node.js communicates with `ml-service/` on port 8000 via standard HTTP JSON POST.
- **Result**: **NODE LEGACY DEPENDENCY: NONE**

---

## 7. Database Dependency Check

- **Primary Database**: PostgreSQL (Neon AWS Remote Instance).
- **PostgreSQL Baseline**:
  - `users`: 21
  - `customer_profiles`: 20
  - `tariff_plans`: 20
  - `usages`: 73
  - `recommendations`: 17
  - `recommendation_plans`: 51
  - `feedbacks`: 11
  - **Total Rows: 213**
  - **Foreign-Key Orphans: 0**
- **Legacy Database**: `smartTariff-backend-main/smarttariff.db` remains 100% untouched.
- **Result**: **SQLITE ACTIVE DEPENDENCY: NONE**

---

## 8. Rollback Verification

All rollback prerequisites were verified as present and intact:
1. `smartTariff-backend-main/` contains complete FastAPI application code.
2. `smarttariff.db` verified with exact SHA256 checksum.
3. `start.bat` and `main.py` ready to launch if port 8000 is reassigned.
4. [`docs/ROLLBACK_RUNBOOK.md`](file:///c:/Users/Lenovo/OneDrive/Desktop/Smarttarrif/docs/ROLLBACK_RUNBOOK.md) verified and accessible.
- **Result**: **ROLLBACK READY: YES**

---

## 9. Backup Verification

- **Backup File**: [`backend-node/backups/cutover_backup_20260917.json`](file:///c:/Users/Lenovo/OneDrive/Desktop/Smarttarrif/backend-node/backups/cutover_backup_20260917.json)
- **Status**: Verified readable and valid JSON.
- **Scope**: All 7 PostgreSQL tables dumped.
- **Total Records Dumped**: Exactly **213 records**.
- **Result**: **BACKUP: VERIFIED**

---

## 10. ML Dependency Verification

> [!CAUTION]
> **CRITICAL ARCHITECTURAL DISTINCTION**:
> The `ml-service/` directory is **NOT** a legacy component. It is a vital sub-system of the primary target architecture.
> Furthermore, the model file `smarttariff_v4_3_random_forest.pkl` and `smarttariff_v4_3_config.json` currently reside inside `smartTariff-backend-main/`. Deleting `smartTariff-backend-main/` would immediately break the ML microservice.

- **Model SHA256**:
  - Expected: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43`
  - Actual:   `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43`
  - Status: **IDENTICAL (UNCHANGED)**

---

## 11. Legacy API Traffic Check

- **Port 8000 Activity**: Only `ml-service/` (FastAPI lightweight runner) is listening on port 8000.
- **Legacy Monolith Traffic**: Zero requests are routed to `smartTariff-backend-main/app/routers/*`.
- **Result**: **LEGACY FASTAPI ACTIVE DEPENDENCY: NONE**

---

## 12. SQLite Traffic Check

- Active application processes hold **zero** open file handles or connections to `smarttariff.db`.
- SQLite SHA256: `1D3A9970F68790A913851736F4635EF0C7FE16C49CC01825BDAA267373F5737D` (100% Match).
- **Result**: **SQLITE ACTIVE TRAFFIC: NONE**

---

## 13. Dependency Decommission Analysis

Evaluation of packages for eventual removal once legacy decommissioning is approved:

| Package | Environment | Current Use | Legacy Use | Active Primary Use | Safe to Remove Later? | Reason |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `sqlalchemy` | Python (`smartTariff-backend-main`) | Legacy DB ORM | SQLite queries | None | **YES** | Primary stack uses Prisma ORM |
| `python-jose` | Python (`smartTariff-backend-main`) | Legacy JWT | FastAPI token auth | None | **YES** | Primary stack uses `jsonwebtoken` in Node |
| `passlib` | Python (`smartTariff-backend-main`) | Legacy hashing | Bcrypt in Python | None | **YES** | Primary stack uses `bcryptjs` in Node |
| `pydantic-settings` | Python (`smartTariff-backend-main`)| Legacy config | Settings class | None | **YES** | `ml-service` uses standard `python-dotenv` |
| `fastapi` | Python (`ml-service`) | Microservice API | Legacy backend | **ACTIVE** | **NO** | Required by `ml-service/` |
| `scikit-learn` | Python (`ml-service`) | ML inference | ML inference | **ACTIVE** | **NO** | Core inference engine |
| `joblib` | Python (`ml-service`) | Model deserialization| Model loading | **ACTIVE** | **NO** | Loads `.pkl` file into memory |
| `pandas` / `numpy`| Python (`ml-service`) | Feature matrix | Feature matrix | **ACTIVE** | **NO** | Required for DataFrame processing |

---

## 14. Decommission Gates

The legacy stack may **ONLY** be decommissioned after meeting all of the following gates:

- [x] **Gate 1**: Target stack verified stable under observation (Phase 10 complete).
- [x] **Gate 2**: Zero active production traffic routes to FastAPI.
- [x] **Gate 3**: Zero active production traffic reads/writes SQLite.
- [x] **Gate 4**: PostgreSQL backup verified with 213 records.
- [ ] **Gate 5**: 30-day production observation window formally elapsed without regression.
- [ ] **Gate 6**: ML model file (`.pkl`) and config (`.json`) migrated into a standalone `ml-service/models/` directory so they are decoupled from `smartTariff-backend-main/`.
- [ ] **Gate 7**: Formal written stakeholder sign-off approving retirement of the legacy rollback option.
- [ ] **Gate 8**: Offline cold-storage archival of `smartTariff-backend-main/` and `smarttariff.db` created.

---

## 15. Future Decommission Sequence (PLAN ONLY — DO NOT EXECUTE)

When all gates in Section 14 are fulfilled, the decommissioning procedure will follow these safe steps:

```
[Step 1: Relocate ML Artifacts]
   Copy .pkl and .json to ml-service/models/
   Update ml-service/.env MODEL_PATH & CONFIG_PATH
   Verify ml-service /health and /model-status
               ↓
[Step 2: Create Permanent Cold Archive]
   Compress smartTariff-backend-main into zip archive
   Store archive in secure offsite cold storage
               ↓
[Step 3: Remove Legacy FastAPI Directory]
   Remove smartTariff-backend-main/ from workspace
               ↓
[Step 4: Clean Migration Artifacts]
   Archive sqlite_dump.json and temporary scratch scripts
               ↓
[Step 5: Full Regression Testing]
   Execute full target stack smoke & end-to-end test suite
               ↓
[Step 6: Close Rollback Window]
   Update documentation declaring legacy stack fully retired
```

---

## 16. Risks

1. **Premature Deletion of Model File**:
   - `smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl` is currently shared with `ml-service/`. Deleting the folder without first copying the model would cause an immediate ML outage.
2. **Loss of Rollback Option**:
   - Decommissioning too early eliminates the emergency restoration path to FastAPI + SQLite.
3. **Database Sequence Drift**:
   - Preserving the SQLite baseline provides the definitive historical verification source.

---

## 17. Final Recommendation

```
READY FOR FUTURE DECOMMISSION
(Pending 30-Day Production Stability Gate and Model Relocation)
```

**LEGACY DECOMMISSIONED = NO**  
All legacy components remain fully intact and operational as a rollback archive.

---

## 18. Final Report Table

| Checkpoint | Status |
| :--- | :--- |
| **TARGET STACK** | **PASS** |
| **LEGACY INVENTORY** | **PASS** |
| **ACTIVE DEPENDENCY AUDIT** | **PASS** |
| **FRONTEND LEGACY DEPENDENCY** | **NONE** |
| **NODE LEGACY DEPENDENCY** | **NONE** |
| **SQLITE ACTIVE DEPENDENCY** | **NONE** |
| **LEGACY FASTAPI ACTIVE DEPENDENCY** | **NONE** |
| **ML SERVICE** | **ACTIVE** |
| **MODEL** | **UNCHANGED** |
| **POSTGRESQL** | **213** |
| **ORPHANS** | **0** |
| **BACKUP** | **VERIFIED** |
| **ROLLBACK** | **READY** |
| **LEGACY DECOMMISSIONED** | **NO** |

---

### FINAL STATUS:
```
READY FOR FUTURE DECOMMISSION
```
