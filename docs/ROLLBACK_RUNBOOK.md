# SmartTariff Rollback Runbook (Legacy Architecture Recovery)

## Important Notice
> [!IMPORTANT]
> This runbook is a documented recovery procedure to return the platform to the legacy FastAPI + SQLite architecture if required.
> **DO NOT EXECUTE THIS ROLLBACK** unless an explicit business or technical regression necessitates reverting from Node.js + Express.

---

## 1. Rollback Architecture Overview

Reverting to the legacy stack switches traffic from the Node/PostgreSQL ecosystem back to FastAPI and SQLite:

```
                      LEGACY RESTORATION PATH
               React Frontend (Vite :5173)
                            │
              (Switch VITE_API_BASE_URL to :8000)
                            │
                            ▼
              FastAPI Backend (:8000)
               ├── SQLite Database (smarttariff.db)
               └── Embedded RandomForest (.pkl)
```

The new `backend-node/`, `ml-service/`, and PostgreSQL database remain completely preserved on disk and in the cloud for future reactivation.

---

## 2. Step-by-Step Rollback Procedure

### Step 1: Stop the New Node.js Backend & Python Microservice
1. Terminate the Node.js Express server running on port `5000`:
   - If running in a terminal: Press `Ctrl + C`.
   - If running as a daemon/service: Stop the corresponding process or background task.
2. (Optional) Terminate the Python ML microservice running on port `8000` to free port `8000` for FastAPI:
   ```powershell
   # Find process listening on port 8000
   Get-NetTCPConnection -LocalPort 8000
   # Stop process
   Stop-Process -Id <PID>
   ```

### Step 2: Verify Legacy SQLite Database & Model Integrity
Before starting FastAPI, verify that the untouched SQLite database and model files are intact:
```powershell
Get-FileHash smartTariff-backend-main\smarttariff.db
# Must match: 1D3A9970F68790A913851736F4635EF0C7FE16C49CC01825BDAA267373F5737D

Get-FileHash smartTariff-backend-main\smarttariff_v4_3_random_forest.pkl
# Must match: 33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43
```

### Step 3: Start the Legacy FastAPI Backend
1. Open a terminal and navigate to `smartTariff-backend-main/`:
   ```bash
   cd smartTariff-backend-main
   ```
2. Start the FastAPI server using uvicorn on port `8000`:
   ```bash
   uvicorn main:app --host 127.0.0.1 --port 8000 --reload
   ```
3. Verify FastAPI is serving:
   - Root: `GET http://127.0.0.1:8000/`
   - Health: `GET http://127.0.0.1:8000/health`
   - Plans: `GET http://127.0.0.1:8000/api/v1/plans`

### Step 4: Point React Frontend Back to FastAPI
1. Open `smartTariff-frontend-main/.env`.
2. Update the API base URL to port `8000`:
   ```env
   VITE_API_BASE_URL=http://localhost:8000/api/v1
   VITE_BACKEND_URL=http://localhost:8000
   VITE_CORS_ORIGIN=http://localhost:8000
   VITE_CLIENT_URL=http://localhost:5173
   ```
3. Restart the Vite dev server to load the updated environment variables:
   ```bash
   cd smartTariff-frontend-main
   npm run dev
   ```

---

## 3. Post-Rollback Functional Verification

Verify legacy end-to-end functionality through the React UI:
1. **Authentication**: Login with `customer@smarttariff.com` / `password123`.
2. **Dashboard**: Verify usage charts load from SQLite `usages` table.
3. **Plans**: View 20 active plans loaded from SQLite `tariff_plans`.
4. **Recommendations**: Trigger "Generate Recommendations" and confirm direct FastAPI RandomForest inference.
5. **Admin Access**: Login with `admin@smarttariff.com` / `admin123` and verify `/admin/dashboard`.

---

## 4. Re-enabling the New Target Stack (Un-rollback)

To switch back to Node.js + Express:
1. Stop FastAPI on port `8000`.
2. Start `ml-service` on port `8000`.
3. Start `backend-node` on port `5000`.
4. Set `VITE_API_BASE_URL=http://localhost:5000/api/v1` in `smartTariff-frontend-main/.env`.
5. Restart Vite frontend.
