# SmartTariff Production Cutover Runbook

## Executive Summary
This document establishes the **Node.js/Express + PostgreSQL + Python ML Microservice** architecture as the **PRIMARY PRODUCTION STACK** for SmartTariff. The legacy FastAPI + SQLite architecture is officially designated as a preserved, dormant rollback archive.

---

## 1. Primary Stack Architecture

```
                       PRIMARY PRODUCTION TOPOLOGY
                       
                 ┌───────────────────────────────────┐
                 │          React Frontend           │
                 │  Vite Dev/Build (:5173 / Static)  │
                 └─────────────────┬─────────────────┘
                                   │  HTTP /api/v1 (Credentials: include)
                                   ▼
                 ┌───────────────────────────────────┐
                 │       Node.js Express API         │
                 │             Port 5000             │
                 │   (Auth, RBAC, Business Logic)    │
                 └────────┬─────────────────┬────────┘
                          │                 │
             Prisma ORM   │                 │  Internal HTTP
             (Connection  │                 │  (Payload Contract: 11 feats)
              Pooling)    ▼                 ▼
        ┌──────────────────────┐     ┌───────────────────────┐
        │ PostgreSQL Database  │     │ Python ML Service     │
        │   (Remote Neon AWS)  │     │       Port 8000       │
        │     213 Records      │     │  FastAPI + Uvicorn    │
        │     0 Inconsistencies│     └──────────┬────────────┘
        └──────────────────────┘                │  Direct Memory Load
                                                ▼
                                     ┌───────────────────────┐
                                     │ RandomForest .pkl     │
                                     │ SHA256: 33584B4865... │
                                     └───────────────────────┘
```

---

## 2. Production Service Configuration

| Service Component | Host / Port | Environment Variables | Health Check Endpoint | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Node.js Express** | `http://127.0.0.1:5000` | `PORT=5000`<br>`DATABASE_URL` (SSL Pooler)<br>`JWT_ACCESS_SECRET`<br>`JWT_REFRESH_SECRET`<br>`ML_SERVICE_URL=http://127.0.0.1:8000` | `GET /health` | **PRIMARY ACTIVE** |
| **Python ML Service**| `http://127.0.0.1:8000` | `MODEL_PATH=../smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl`<br>`CONFIG_PATH=../smartTariff-backend-main/smarttariff_v4_3_config.json` | `GET /health`<br>`GET /model-status` | **PRIMARY ACTIVE** |
| **PostgreSQL DB** | Remote Neon AWS | SSL enabled, Prisma connection pool | Checked via Node Express `/health` | **PRIMARY ACTIVE** |
| **React Frontend** | `http://localhost:5173` | `VITE_API_BASE_URL=http://localhost:5000/api/v1` | `GET /` | **PRIMARY ACTIVE** |

---

## 3. Standard Service Startup Sequence

To start the primary production stack cleanly:

### Step 1: Start Python ML Microservice
```powershell
cd ml-service
.\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```
*Verification:*
```powershell
curl http://127.0.0.1:8000/health
curl http://127.0.0.1:8000/model-status
```

### Step 2: Start Node.js Express API
```powershell
cd backend-node
node src/server.js
```
*Verification:*
```powershell
curl http://127.0.0.1:5000/health
```

### Step 3: Start / Serve React Frontend
```powershell
cd smartTariff-frontend-main
npm run preview # or npx vite --port 5173 --host
```

---

## 4. Pre-Cutover Backup & Integrity Baseline

- **PostgreSQL Pre-Cutover Logical Snapshot**:
  - File: `backend-node/backups/cutover_backup_20260917.json` (Size: 80,266 bytes)
  - Tables & Records Dumped:
    - `users`: 21
    - `customer_profiles`: 20
    - `tariff_plans`: 20
    - `usages`: 73
    - `recommendations`: 17
    - `recommendation_plans`: 51
    - `feedbacks`: 11
    - **Total Records: 213**
    - **Orphan Records: 0**
- **Legacy SQLite Database Checksum**:
  - SHA256: `1D3A9970F68790A913851736F4635EF0C7FE16C49CC01825BDAA267373F5737D` (Unchanged)
- **RandomForest Model Checksum**:
  - SHA256: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43` (Unchanged)

---

## 5. Automated Verification Checklist

Before declaring any maintenance or deployment complete, run the following verification scripts:
1. `node scratch/verify_pg_data.js` — All 7 tables match SQLite source 1:1, 0 foreign-key orphans, sequences synchronized.
2. `node scratch/phase9_smoke_test.js` — Cross-stack health, login, profile, 20 plans, ML recommendation generation, and admin dashboard pass.

---

## 6. Incident Management & Failover

If the Python ML microservice becomes unavailable:
- The Node.js recommendation engine automatically falls back to deterministic rule-based scoring.
- User-facing recommendation requests will succeed (`generatedBy: "rule-based"`).
- Alerting will notify on `ML service unreachable` via application logging.

If an catastrophic regression requires immediate full rollback:
- Consult [ROLLBACK_RUNBOOK.md](file:///c:/Users/Lenovo/OneDrive/Desktop/Smarttarrif/docs/ROLLBACK_RUNBOOK.md) to restore FastAPI + SQLite immediately without data loss.
