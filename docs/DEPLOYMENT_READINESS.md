# SmartTariff Deployment Readiness Runbook

## 1. Architecture Overview

SmartTariff operates under a modern decoupled multi-tier architecture:

```
                          PRODUCTION ARCHITECTURE TOPOLOGY
                          
                      ┌──────────────────────────────────────┐
                      │            User Browser              │
                      └──────────────────┬───────────────────┘
                                         │  HTTPS
                                         ▼
                      ┌──────────────────────────────────────┐
                      │       Reverse Proxy / CDN / ALB      │
                      │       (Cloudflare / AWS ALB / Nginx) │
                      └──────────┬────────────────┬──────────┘
             Static Assets (/)   │                │   API (/api/v1/*)
                                 ▼                ▼
             ┌─────────────────────────┐   ┌─────────────────────────┐
             │ React Frontend (Vite)   │   │ Node.js Express API     │
             │ SPA Static Hosting      │   │ Port 5000               │
             │ (Vercel / S3 / Nginx)   │   │ (PM2 / ECS / K8s)       │
             └─────────────────────────┘   └─────┬──────────────┬────┘
                                                 │              │
                                    Prisma ORM   │              │  Private VPC / Localhost
                                  (SSL Pooling)  ▼              ▼  (HTTP POST /predict)
                                    ┌──────────────────┐  ┌─────────────────────────┐
                                    │ PostgreSQL       │  │ Python ML Microservice  │
                                    │ (Neon AWS Cloud) │  │ Port 8000               │
                                    │ 213 Baseline     │  │ FastAPI + Uvicorn       │
                                    └──────────────────┘  └─────────────┬───────────┘
                                                                        │ In-Memory Load
                                                                        ▼
                                                          ┌─────────────────────────┐
                                                          │ RandomForest Model      │
                                                          │ SHA256: 33584B4865...   │
                                                          └─────────────────────────┘
```

---

## 2. Deployment Prerequisites

Before deploying to production, verify:
- **Node.js**: v20.x LTS or v22.x LTS.
- **Python**: v3.11.x or v3.12.x with scikit-learn, joblib, pandas, and numpy installed.
- **PostgreSQL**: Hosted PostgreSQL (version 15+) with SSL support and PgBouncer/Neon connection pooling.
- **TLS/HTTPS**: Valid SSL certificate configured on the reverse proxy / domain.
- **Network Routing**: Port 8000 (Python ML microservice) restricted to private internal network only.

---

## 3. Production Startup Order

To initialize the production services cleanly:

### Step 1: PostgreSQL Database Verification
Ensure the PostgreSQL instance is healthy and reachable:
```bash
# In backend-node/
npx prisma db push --skip-generate # or npx prisma migrate status
```

### Step 2: Start Python ML Microservice
```bash
cd ml-service
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
```
*Health Probe*: `GET http://127.0.0.1:8000/health` (Must return `{"model_loaded": true}`).

### Step 3: Start Node.js Express Backend
```bash
cd backend-node
node src/server.js
```
*Health Probe*: `GET http://127.0.0.1:5000/health` (Must return `{"status": "ok", "database": "connected"}`).

### Step 4: Deploy / Serve React Frontend
```bash
cd smartTariff-frontend-main
npm run build
# Serve dist/ via Nginx, Caddy, Vercel, or AWS S3 + CloudFront
```

---

## 4. Security Hardening & Audit Findings

| Category | Security Control | Production Status | Severity / Notes |
| :--- | :--- | :--- | :--- |
| **HTTP Security Headers** | Helmet middleware configured | **ACTIVE** | Applies CSP, CORP, HSTS in production. |
| **CORS Policy** | Whitelist origin matching | **ACTIVE** | Disallows wildcard `*` with credentials. Whitelist customizable via `FRONTEND_URL`. |
| **Authentication** | JWT Access + Refresh tokens | **ACTIVE** | Access token in memory/headers; Refresh token in `HTTP-Only` cookie. |
| **Cookie Security** | `httpOnly: true`, `sameSite: strict` | **ACTIVE** | `secure: true` automatically enabled when `NODE_ENV=production`. |
| **Password Hashing** | Bcrypt with salt rounds (10) | **ACTIVE** | Zero plaintext passwords or hashes logged or returned in responses. |
| **Input Validation** | Strict type & range validation | **ACTIVE** | Malformed JSON and missing parameters return clean 4xx responses without stack traces. |
| **Rate Limiting** | Evaluated for production | **DOCUMENTED** | Recommended deployment gateway rate limiter (e.g. Cloudflare / Nginx 100 req/min per IP). |
| **Secrets Exposure** | `.env` audit | **PASS** | Zero credentials, connection strings, or JWT secrets committed or printed. |

---

## 5. Microservice Resilience & ML Failover

- **Node $\rightarrow$ ML Request Timeout**: Configured with a 5-second AbortController timeout.
- **Failover Guarantee**: If the Python ML microservice on port 8000 is unavailable, unresponsive, or returns an error, the Node.js backend automatically executes the deterministic rule-based scoring engine.
- **User Impact**: 0% downtime for end users (`generatedBy: "rule-based"` fallback returned seamlessly).

---

## 6. Rollback Reference & Emergency Procedures

If a critical deployment defect requires restoring the legacy architecture:
1. Stop the Node.js backend on port 5000 and Python ML microservice on port 8000.
2. Follow the verified step-by-step restoration procedure in [`docs/ROLLBACK_RUNBOOK.md`](file:///c:/Users/Lenovo/OneDrive/Desktop/Smarttarrif/docs/ROLLBACK_RUNBOOK.md).
3. Start the legacy FastAPI server:
   ```bash
   cd smartTariff-backend-main
   start.bat # or uvicorn app.main:app --port 8000
   ```
4. Point the React frontend `VITE_API_BASE_URL` to `http://localhost:8000/api/v1`.
5. Verify `smarttariff.db` remains intact (`SHA256: 1D3A9970...`).

---

## 7. Known Operational Observations

1. **Remote Database Latency**:
   - The PostgreSQL instance is hosted in Neon AWS `ap-southeast-2` (Sydney).
   - In cross-continent local testing, initial connection handshake incurs round-trip latency.
   - For optimal performance, deploy Node.js Express containers in the same AWS cloud region as the database.
2. **Reverse Proxy SSL Header**:
   - In containerized production (Docker / Kubernetes), ensure the reverse proxy sends `trust proxy` headers (`X-Forwarded-Proto: https`) so Express enables HTTPS cookies.
