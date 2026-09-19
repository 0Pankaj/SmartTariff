# SmartTariff Post-Cutover Monitoring Guide

## Overview
This document specifies operational monitoring protocols, logging standards, performance observations from Phase 10 stabilization, and alert escalation pathways for the primary **Node.js/Express + PostgreSQL + Python ML Microservice** production architecture.

---

## 1. Core Service Health Endpoints

| Target Service | Endpoint | Protocol | Expected Status | Interval | Critical Condition |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Node.js API** | `http://127.0.0.1:5000/health` | HTTP GET | 200 OK (`database: "connected"`) | 30s | Status != 200 or `database: "disconnected"` |
| **Python ML** | `http://127.0.0.1:8000/health` | HTTP GET | 200 OK (`model_loaded: true`) | 30s | Status != 200 or `model_loaded: false` |
| **Python Model** | `http://127.0.0.1:8000/model-status` | HTTP GET | 200 OK (`n_features: 11`) | 60s | Status != 200 or feature contract mismatch |
| **Frontend UI** | `http://localhost:5173/` | HTTP GET | 200 OK | 60s | Connection refused or 5xx response |

---

## 2. Telemetry & Log Monitoring

### Log Locations & Aggregation
- **Node.js Express API**: Standard output (Morgan stream) and process supervisor logs.
  - Development / Staging: `backend-node/logs/` or stdout.
  - Production: PM2 / systemd / Docker journalctl.
- **Python ML Microservice**: Uvicorn access & application error stream.
  - Verification: `[INFO] Loading RandomForest model`, `Prediction calculated in X.XXms`.
- **PostgreSQL Database**: Neon AWS Console metrics (connection pool saturation, active queries, IOPS).

### Key Error Patterns to Monitor
1. **`[WARN] Python ML service unreachable, falling back to rule-based engine`**
   - **Meaning**: Node.js backend timed out or failed to connect to port 8000.
   - **Impact**: Non-breaking for users (fallback recommendation works), but indicates ML microservice down.
   - **Action**: Check `task-876` / Uvicorn process on port 8000; restart if required.
2. **`PrismaClientKnownRequestError` / `Connection terminated`**
   - **Meaning**: Database network connectivity issue or connection pool exhaustion.
   - **Action**: Verify Neon SSL pooler status and check pool size in `DATABASE_URL`.
3. **`401 Unauthorized` spike on `/api/v1/auth/refresh`**
   - **Meaning**: Expired refresh tokens or cross-site cookie blocking.
   - **Action**: Verify browser third-party cookie policies and HTTPS domain alignment.

---

## 3. Empirical Phase 10 Stabilization Performance Observations

The following response timings were empirically measured during Phase 10 live validation:

| Endpoint | Observed Timing | HTTP Status | Notes |
| :--- | :--- | :--- | :--- |
| **GET /health** | 1,843 ms | 200 OK | Remote Neon SSL connection check included |
| **Python GET /health** | 8 ms | 200 OK | Fast local in-memory health probe |
| **Python GET /model-status** | 5 ms | 200 OK | Model metadata and feature contract inspection |
| **POST /auth/login (Customer)** | 1,402 ms | 200 OK | Bcrypt compare + JWT generation + DB lookup |
| **POST /auth/login (Admin)** | 1,232 ms | 200 OK | Bcrypt compare + JWT generation + DB lookup |
| **GET /customers/me/profile** | 1,642 ms | 200 OK | Authenticated Prisma profile read |
| **GET /plans?limit=20** | 928 ms | 200 OK | Full catalog listing with serialization |
| **GET /usage/me** | 2,136 ms | 200 OK | Historical usage query |
| **POST /recommendations/generate (Real ML)**| 8,521 ms | 201 Created | Complex transaction: customer profile query + plan scan + ML HTTP call + feature matrix computation + ranking + persistence of rec and rec_plans |
| **POST /recommendations/generate (Fallback)**| 2,450 ms | 201 Created | Fast deterministic fallback under simulated ML outage |
| **GET /admin/dashboard** | 14,350 ms | 200 OK | Aggregate metrics query across 7 remote PostgreSQL tables |
| **GET /admin/recommendations** | 5,479 ms | 200 OK | Paginated audit log retrieval with relation joins |

*Note: Latency is influenced by cross-continent round trips to remote Neon AWS (ap-southeast-2) from a local development environment. Production co-location in the same AWS region will achieve sub-100ms response times.*

---

## 4. Daily Operational Health Checklist

- [ ] Run health check probes on ports 5000 and 8000.
- [ ] Verify `verify_pg_data.js` shows zero table discrepancies and zero orphans (Baseline: 213 records, 0 orphans).
- [ ] Inspect ML service memory consumption (< 350MB nominal footprint for scikit-learn).
- [ ] Confirm no unresolved 5xx exceptions logged in the preceding 24-hour window.
- [ ] Ensure `smartTariff-backend-main/smarttariff.db` remains untouched and intact (`SHA256: 1D3A9970...`).
