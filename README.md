# SmartTariff — Intelligent Mobile & Electricity Tariff Recommendation Platform

SmartTariff is a modern full-stack telecommunications and utility tariff recommendation platform engineered to analyze customer consumption patterns and deliver optimized, cost-saving plan recommendations powered by Machine Learning.

---

## System Architecture

```text
                 React 19 / Vite 7 (Frontend)
                             |
                             v
              Node.js + Express + Prisma (Backend API)
                /                         \
               v                           v
   PostgreSQL / Neon (Database)    Python ML Service (:8000)
                                           |
                                           v
                              RandomForestRegressor V4.3
```

- **Frontend**: React 19 + Vite 7 + Tailwind CSS (`smartTariff-frontend-main/`)
- **Backend API**: Node.js + Express + Prisma ORM (`backend-node/`, Port 5000)
- **Database**: PostgreSQL / Neon Cloud Database
- **ML Microservice**: Standalone Python FastAPI service (`ml-service/`, Port 8000)
- **ML Model**: Scikit-Learn `RandomForestRegressor` V4.3 (`ml-model/`)

> [!IMPORTANT]
> **Architectural Separation**:
> The Python FastAPI service is **NOT** the application backend. It is a dedicated, stateless ML inference microservice communicating strictly with Node.js over internal HTTP for real-time recommendation scoring and vector inference. The primary application backend is **Node.js + Express + Prisma**.

---

## Architecture Migration Summary

The SmartTariff platform was fully migrated to an enterprise-grade stack:

### Previous Architecture (Legacy)
```text
React -> FastAPI (Monolith) -> SQLite 3 (smarttariff.db)
```
*Status: Officially retired and preserved offline in archival storage.*

### Current Architecture (Production)
```text
React -> Node.js / Express -> PostgreSQL (Neon)
                  |
                  v
       Python ML Microservice (FastAPI on :8000)
                  |
                  v
       RandomForestRegressor V4.3
```

---

## Repository Structure

```text
SmartTariff/
|-- smartTariff-frontend-main/     # React 19 + Vite 7 frontend application
|-- backend-node/                  # Primary application backend (Express + Prisma + PostgreSQL)
|-- ml-service/                    # Dedicated Python ML inference microservice (Port 8000)
|-- ml-model/                      # Active ML model artifact & configuration
|   |-- smarttariff_v4_3_random_forest.pkl (8.25 MB, Scikit-Learn RandomForestRegressor)
|   `-- smarttariff_v4_3_config.json       (Model feature metadata & plan configs)
|-- docs/                          # Comprehensive migration, stabilization, & operational runbooks
|-- .gitignore                     # Root exclusion rules (excludes credentials, backups, archives)
`-- README.md                      # Primary project documentation
```

---

## Quick Start

### 1. Python ML Inference Microservice
```bash
cd ml-service
python -m venv venv
# Windows: venv\Scripts\activate | Unix: source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
```
Health Check: `http://localhost:8000/health`

### 2. Node.js Express Backend
```bash
cd backend-node
npm install
npm run prisma:generate
npm start
```
Health Check: `http://localhost:5000/health`  
API Base URL: `http://localhost:5000/api/v1`

### 3. React Frontend
```bash
cd smartTariff-frontend-main
npm install
npm run dev
```
Client URL: `http://localhost:5173`

---

## Testing & Quality Assurance

- **Node.js Backend**: `npm test` inside `backend-node/` (18/18 tests pass)
- **Python ML Microservice**: `pytest` inside `ml-service/` (7/7 tests pass)
- **Frontend Production Build**: `npm run build` inside `smartTariff-frontend-main/` (Vite singlefile production build)
- **Database**: PostgreSQL with 218 verified records and 0 foreign-key orphans.
- **Model Verification**: `ml-model/smarttariff_v4_3_random_forest.pkl` SHA256: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43`

---

## License

MIT License