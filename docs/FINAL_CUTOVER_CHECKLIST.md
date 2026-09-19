# SmartTariff Final Cutover Readiness Checklist

This checklist documents the readiness criteria for transitioning SmartTariff into production under the Node.js + PostgreSQL + Python ML architecture.

---

## 1. Database (PostgreSQL & Prisma)
- [x] **PostgreSQL Connection**: Successfully verified via Prisma `$queryRaw` connectivity check.
- [x] **Schema Integrity**: All 7 tables created with primary keys, indexes, foreign keys, and default values matching specifications.
- [x] **Data Migration Parity**: 213 total records migrated from SQLite to PostgreSQL with 0 missing records.
- [x] **Orphan Records**: 0 foreign key or orphaned record violations detected across all relations.
- [x] **Sequence Alignment**: All PostgreSQL sequence generators (`nextval`) synchronized with current `MAX(id)`.
- [x] **Backups & Safety**: SQLite baseline preserved as read-only snapshot (`smarttariff.db`, SHA256 verified).

## 2. Backend (Node.js + Express)
- [x] **Health Checks**: `GET /health` and `GET /api/v1/health` returning 200 OK with database connection status.
- [x] **Authentication**: JWT access token generation (15m) and secure refresh token handling (7d) operational.
- [x] **Token Refresh Flow**: `POST /api/v1/auth/refresh` verified with HTTP-only cookie parsing.
- [x] **Role-Based Access Control**: Strict separation between customer and admin roles enforced across all routes.
- [x] **Error Handling**: Centralized error middleware catches invalid inputs, 401s, 403s, 404s, and 500s without stack trace leaks.
- [x] **Automated Tests**: All backend integration tests passing (`18 passed, 0 failed`).

## 3. Machine Learning (Python Microservice & RandomForest)
- [x] **Model Artifact Integrity**: `smarttariff_v4_3_random_forest.pkl` SHA256 matches baseline `33584B48...`.
- [x] **Model Loading**: Untouched `RandomForestRegressor` successfully loaded into memory via joblib.
- [x] **11-Feature Contract**: Verified exact order and feature bounds matching `smarttariff_v4_3_config.json`.
- [x] **Microservice Endpoints**: `/health`, `/model-status`, and `/predict` operational.
- [x] **Node → Python Integration**: Express successfully dispatches candidate payloads and parses inference scores.
- [x] **Fallback Engine**: Verified automatic, graceful fallback to deterministic rule-based scoring when ML service is offline.
- [x] **No Fake Predictions**: Explicit `"generatedBy": "ml"` vs `"generatedBy": "rule-based"` tracking.

## 4. Frontend (React 19 + Vite)
- [x] **API Base URL**: Configured dynamically via `VITE_API_BASE_URL=http://localhost:5000/api/v1`.
- [x] **No Legacy Direct Calls**: Zero calls to `:8000` or old endpoints within React components.
- [x] **Production Bundle**: `npm run build` compiles with 0 errors and 0 lint warnings.
- [x] **Customer Flows**: 11 out of 11 verified (Register, Login, Dashboard, Profile, Usage, Plans, Recommendations, History, Feedback, Logout, Refresh).
- [x] **Admin Flows**: 12 out of 12 verified (Login, Dashboard, Customers, Details, Status, Plans, Create, Update, Delete, Usage, Feedback, Recommendations, Logout).
- [x] **Response Normalization**: All entity models support both `id` and `_id`, JSON fields parsed into objects.

## 5. Security & Environment
- [x] **CORS Configuration**: Restricts origins to allowed frontend domains with `credentials: true`.
- [x] **HTTP-Only Cookies**: `refreshToken` stored in `HttpOnly`, `SameSite=Lax` cookie, not exposed to JavaScript.
- [x] **Secret Isolation**: No database passwords or JWT signing secrets committed or exposed to frontend code.
- [x] **Frontend Environment**: Only public `VITE_*` configuration exposed in client bundle.
- [x] **Input Validation**: Pydantic schemas validate finite, positive numbers on ML inputs; Express validates request bodies.

## 6. Legacy Preservation & Rollback
- [x] **FastAPI Preserved**: `smartTariff-backend-main/` directory remains intact, unmodified, and undeleted.
- [x] **SQLite Database Preserved**: `smarttariff.db` remains intact and unmodified.
- [x] **Rollback Documentation**: Complete operational procedure documented in `docs/ROLLBACK_RUNBOOK.md`.
- [x] **Dual Stack Verification**: System can cleanly toggle between stacks by switching ports and environment variables.

---

## Final Verdict
**STATUS**: **READY FOR FINAL CUTOVER**
The target platform has passed all cross-stack automated validation tests, unit tests, end-to-end user journeys, and data integrity audits.
