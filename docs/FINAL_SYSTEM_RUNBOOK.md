# SmartTariff Final System Runbook

## Overview
This runbook provides complete operational instructions for running, monitoring, troubleshooting, and shutting down the SmartTariff platform under the migrated production architecture:

```
React Frontend (Vite :5173)
       │  HTTP /api/v1 (Bearer Token + HTTP-only Cookie)
       ▼
Node.js Express Backend (:5000)
       ├── PostgreSQL (:5432) via Prisma ORM
       └── Python ML Microservice (:8000) via HTTP
               └── RandomForestRegressor (.pkl)
```

---

## 1. System Component Overview

| Component | Working Directory | Default Port | Health / Status URL | Key Tech Stack |
|---|---|---|---|---|
| **PostgreSQL Database** | Remote AWS Neon / Local | `5432` | Prisma `$queryRaw` `SELECT 1` | PostgreSQL 16+, Prisma ORM |
| **Python ML Microservice** | `ml-service/` | `8000` | `http://127.0.0.1:8000/health`<br>`http://127.0.0.1:8000/model-status` | Python 3.12, FastAPI, scikit-learn, joblib |
| **Node.js Express Backend** | `backend-node/` | `5000` | `http://localhost:5000/health`<br>`http://localhost:5000/api/v1` | Node.js v20+, Express.js, Prisma, JWT, bcryptjs |
| **React Frontend** | `smartTariff-frontend-main/` | `5173` | `http://localhost:5173/` | React 19, Vite 7, TailwindCSS 4, Redux Toolkit |

---

## 2. Standard Startup Procedure (Exact Order)

To ensure smooth connection pooling and health checks, start the services in the following order:

### Step 1: PostgreSQL Database
1. Ensure the PostgreSQL instance is running and accepting connections.
2. In `backend-node/`, verify `.env` contains valid `DATABASE_URL`.
3. Verify connection:
   ```bash
   cd backend-node
   npm run prisma:validate
   ```

### Step 2: Python ML Microservice
1. Open a terminal and navigate to `ml-service/`:
   ```bash
   cd ml-service
   ```
2. Activate virtual environment and start uvicorn:
   ```bash
   # Windows PowerShell
   .\venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
   ```
3. Verify in browser or terminal:
   - Health: `GET http://127.0.0.1:8000/health` $\rightarrow$ `{"success":true,"data":{"status":"ok","model_loaded":true}}`
   - Model Status: `GET http://127.0.0.1:8000/model-status` $\rightarrow$ Reports 11 features, `RandomForestRegressor`.

### Step 3: Node.js Express Backend
1. Open a separate terminal and navigate to `backend-node/`:
   ```bash
   cd backend-node
   ```
2. Start the Express server:
   ```bash
   npm start
   # or for development with auto-reload:
   npm run dev
   ```
3. Verify health:
   - `GET http://localhost:5000/health` $\rightarrow$ `{"success":true,"data":{"status":"ok","database":"connected"}}`

### Step 4: React Frontend
1. Open a third terminal and navigate to `smartTariff-frontend-main/`:
   ```bash
   cd smartTariff-frontend-main
   ```
2. Ensure `.env` is configured:
   ```env
   VITE_API_BASE_URL=http://localhost:5000/api/v1
   VITE_CLIENT_URL=http://localhost:5173
   ```
3. Start Vite dev server:
   ```bash
   npm run dev
   ```
4. Access the web application at `http://localhost:5173/`.

---

## 3. Environment Variables Reference

### `backend-node/.env`
* `PORT`: Port for Express server (default: `5000`).
* `NODE_ENV`: `development` or `production`.
* `DATABASE_URL`: PostgreSQL connection string (`postgresql://<user>:<password>@<host>:5432/<dbname>?sslmode=require`).
* `JWT_ACCESS_SECRET`: Secret key used to sign access tokens (15m validity).
* `JWT_REFRESH_SECRET`: Secret key used to sign refresh tokens (7d validity).
* `FRONTEND_URL`: Allowed CORS origin (default: `http://localhost:5173`).
* `ML_SERVICE_URL`: URL of Python ML service (default: `http://127.0.0.1:8000`).

### `ml-service/.env`
* `HOST`: Bind host (default: `127.0.0.1`).
* `PORT`: Bind port (default: `8000`).
* `MODEL_PATH`: Relative or absolute path to `smarttariff_v4_3_random_forest.pkl`.
* `CONFIG_PATH`: Relative or absolute path to `smarttariff_v4_3_config.json`.

### `smartTariff-frontend-main/.env`
* `VITE_API_BASE_URL`: Express API endpoint (default: `http://localhost:5000/api/v1`).
* `VITE_CLIENT_URL`: Client URL for CORS alignment (default: `http://localhost:5173`).

---

## 4. Troubleshooting & Resilience

### A. Python ML Service Offline / Unreachable
* **Symptom**: `GET http://localhost:5000/api/v1/recommendations/generate` returns recommendations with `"generatedBy": "rule-based"`.
* **Behavior**: The Node backend catches connection errors, aborts after 5s timeout, and seamlessly falls back to the deterministic scoring engine. The server **does not crash**.
* **Remedy**: Restart `ml-service` via `python -m uvicorn app.main:app --port 8000`.

### B. Database Connection Drops (e.g. Neon Serverless Pooler Sleep)
* **Symptom**: `GET /health` reports `"database": "disconnected"`.
* **Behavior**: Prisma automatically reconnects on the next query once the pooler wakes up.
* **Remedy**: Check database credentials or network connectivity if disconnected state persists.

### C. Frontend CORS Rejections
* **Symptom**: Browser console displays `CORS policy: Origin ... not allowed`.
* **Remedy**: Ensure `FRONTEND_URL` in `backend-node/.env` includes the requesting origin (e.g. `http://localhost:5173`).

---

## 5. Shutdown Procedure

To cleanly shut down the platform:
1. Stop React frontend: `Ctrl + C` in Vite terminal.
2. Stop Node.js backend: `Ctrl + C` in Express terminal.
3. Stop Python ML microservice: `Ctrl + C` in Uvicorn terminal.
4. Database connections will close gracefully.
