# Phase 6 Report: Python ML Microservice Setup & Node.js Integration

## Executive Summary
Phase 6 successfully established a standalone Python FastAPI microservice inside `ml-service/` that directly loads the existing, untouched SmartTariff V4.3 Random Forest Regressor artifact (`smarttariff_v4_3_random_forest.pkl`). The microservice exposes HTTP endpoints for real-time model inference and metadata. The Node.js backend (`backend-node/src/services/mlService.js`) was updated to seamlessly dispatch prediction requests to the microservice while preserving complete, graceful fallback to deterministic rule-based scoring when the microservice is offline or unreachable.

All safety constraints were strictly preserved:
* **The RandomForest model was NOT retrained or modified.**
* **The `.pkl` file SHA256 was verified identical before and after Phase 6: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43`.**
* **The FastAPI backend was NOT modified, deleted, or renamed.**
* **The SQLite database (`smarttariff.db`) was NOT modified** (SHA256 verified identical: `1D3A9970...`).
* **The React frontend was NOT modified.**
* **The PostgreSQL database schema was NOT altered.**
* **The 213 migrated PostgreSQL records remain 100% intact with 0 orphan records.**

---

## 1. Existing ML Implementation Discovery & Contract Verification

### A. Model Artifact
* **File**: `smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl`
* **Model Class**: `RandomForestRegressor`
* **Size**: 8.65 MB (compressed level 3 with joblib)
* **n_features_in_**: **11**
* **SHA256**: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43`

### B. Verified 11-Feature Contract (Exact Order)
1. `data_per_month_gb` (float)
2. `sms_per_month` (float)
3. `monthly_equivalent_inr` (float)
4. `duration_months` (float)
5. `discount_percent` (float)
6. `data_coverage_ratio` (float)
7. `sms_coverage_ratio` (float)
8. `data_waste_ratio` (float)
9. `sms_waste_ratio` (float)
10. `price_to_budget_ratio` (float)
11. `duration_match` (float: 1.0, 0.0, or 0.5)

### C. Post-Processing & Heuristic Rules
- **Duration Multiplier**:
  - Annual plan preference matching: $\times 1.15$
  - 3-Month bundle preference matching: $\times 1.12$
  - 1-Month preference matching: $\times 1.05$
- **5G Requirement Adjustment**: $\times 0.75$ penalty if user mandates 5G but plan does not support 5G.
- **Score Bounding**: Bounded within $[0, 100]$ integer range.
- **Explainability**: Up to 5 human-understandable reason strings dynamically constructed.

---

## 2. Python ML Microservice Architecture (`ml-service/`)

The microservice was implemented inside `ml-service/` as an isolated FastAPI application:

```
ml-service/
├── app/
│   ├── __init__.py
│   ├── config.py       # Resolves MODEL_PATH, CONFIG_PATH, PORT, HOST
│   ├── model.py        # Safe joblib unpickler, metadata extractor
│   ├── predictor.py    # Feature engineering, RF execution, explainability generator
│   ├── schemas.py      # Pydantic schemas with finite/non-negative validation
│   └── main.py         # FastAPI application: /health, /model-status, /predict
├── tests/
│   └── test_ml_service.py # Pytest integration test suite (7/7 passing)
├── venv/               # Dedicated virtual environment (Python 3.12, scikit-learn, joblib)
├── requirements.txt    # Frozen dependencies
├── .env.example
├── .env
└── README.md
```

### Microservice Endpoints
1. `GET /health`:
   ```json
   {
     "success": true,
     "data": {
       "status": "ok",
       "model_loaded": true
     }
   }
   ```
2. `GET /model-status`:
   ```json
   {
     "success": true,
     "data": {
       "status": "active",
       "model_loaded": true,
       "model_type": "RandomForestRegressor",
       "model_name": "SmartTariff V4.3 (size-controlled)",
       "version": "SmartTariff V4.3 (size-controlled)",
       "n_features": 11,
       "features": [
         "data_per_month_gb",
         "sms_per_month",
         "monthly_equivalent_inr",
         "duration_months",
         "discount_percent",
         "data_coverage_ratio",
         "sms_coverage_ratio",
         "data_waste_ratio",
         "sms_waste_ratio",
         "price_to_budget_ratio",
         "duration_match"
       ],
       "training_customers": 30000,
       "plans_configured": 20
     }
   }
   ```
3. `POST /predict`:
   - Supports both direct raw 11-feature input and full candidate recommendation payloads (`customer`, `usage`, `plans`).
   - Rejects invalid non-numeric, negative, or infinite values with `400 Bad Request`.

---

## 3. Node.js Integration & Fallback Strategy

The Node.js service (`backend-node/src/services/mlService.js`) handles dispatching requests to the Python microservice over HTTP:
- **`ML_SERVICE_URL`**: Configured as `http://127.0.0.1:8000`.
- **Timeouts & Resilience**: Requests are dispatched with an `AbortController` timeout (5 seconds).
- **Graceful Fallback**: If the microservice is offline, times out, returns HTTP 503, or outputs an invalid schema, Node.js gracefully returns `null`, causing `recommendationService.js` to immediately activate the deterministic rule-based fallback engine.
- **Zero Fake Predictions**: If ML inference fails, recommendations are tagged as `"generatedBy": "rule-based"`; when the microservice successfully responds, they are tagged as `"generatedBy": "ml"`.

---

## 4. Testing & Verification Results

### A. Python ML Microservice Test Suite (`pytest`)
Executed `python -m pytest -v` inside `ml-service/`:
```text
tests/test_ml_service.py::test_1_model_loads_successfully PASSED         [ 14%]
tests/test_ml_service.py::test_2_get_health PASSED                       [ 28%]
tests/test_ml_service.py::test_3_get_model_status PASSED                 [ 42%]
tests/test_ml_service.py::test_4_valid_post_predict_vector PASSED        [ 57%]
tests/test_ml_service.py::test_5_valid_post_predict_recommendations PASSED [ 71%]
tests/test_ml_service.py::test_6_missing_feature_validation PASSED       [ 85%]
tests/test_ml_service.py::test_7_invalid_numeric_input PASSED            [100%]
======================== 7 passed in 5.45s ========================
```

### B. Node.js Backend Integration Test Suite (`node --test`)
Executed `npm test` inside `backend-node/`:
```text
TAP version 13
ok 1 - 1. GET /health reports API healthy and database connected
ok 2 - 2. Database connection helper reports connected: true
ok 3 - 3. POST /api/v1/auth/login validates existing user and returns JWT
ok 4 - 4. GET /api/v1/auth/me returns authenticated user details
ok 5 - 5. POST /api/v1/auth/refresh returns new access token
ok 6 - 6. POST /api/v1/auth/logout clears refresh cookie
ok 7 - 7. GET /api/v1/customers/me/profile returns own profile
ok 8 - 8. Admin authorization blocks normal customer from admin endpoints
ok 9 - 9. Admin can access GET /api/v1/admin/dashboard
ok 10 - 10. GET /api/v1/plans lists active tariff plans
ok 11 - 11. PUT & PATCH /api/v1/plans/:id updates plan when called by admin
ok 12 - 12. GET /api/v1/usage/me returns usage list for current user
ok 13 - 13. Recommendation system: GET /model-status & GET /me
ok 14 - 14. Feedback authorization prevents submitting against another customer recommendation
ok 15 - 15. Admin GET /api/v1/admin/recommendations returns populated recommendations
ok 16 - 16. Node.js -> Python ML microservice integration & fallback
ok 17 - App loads and defines core endpoints
ok 18 - Environment configuration loads properly
1..18
# tests 18
# pass 18
# fail 0
```

### C. Live End-to-End Prediction Verification
A live end-to-end test query from Node.js to the Python microservice returned real RandomForest predictions:
```json
{
  "recommendations": [
    {
      "planId": 5,
      "rank": 1,
      "score": 94,
      "reasons": [
        "Matches your 1-Month plan preference",
        "Matches your 45 GB monthly data needs",
        "Fits your monthly budget",
        "Unlimited voice calling included",
        "High ML Match Score (94%)"
      ]
    },
    {
      "planId": 1,
      "rank": 2,
      "score": 59,
      "reasons": [
        "Matches your 1-Month plan preference",
        "Fits your monthly budget",
        "Unlimited voice calling included"
      ]
    }
  ],
  "generatedBy": "ml",
  "model": "SmartTariff V4.3 (size-controlled)"
}
```

---

## 5. Final Safety & Integrity Check

```
FINAL SAFETY CHECK:
- RandomForest ML Model (.pkl): UNCHANGED
  SHA256 Before: 33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43
  SHA256 After:  33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43 (MATCH, untouched)
- SQLite database (smartTariff-backend-main/smarttariff.db): UNCHANGED
  SHA256 Before: 1D3A9970F68790A913851736F4635EF0C7FE16C49CC01825BDAA267373F5737D
  SHA256 After:  1D3A9970F68790A913851736F4635EF0C7FE16C49CC01825BDAA267373F5737D (MATCH, untouched)
- FastAPI backend: UNCHANGED
- React frontend: UNCHANGED
- PostgreSQL schema: UNCHANGED
- PostgreSQL records: EXACTLY 213 (users: 21, customer_profiles: 20, tariff_plans: 20, usages: 73, recommendations: 17, recommendation_plans: 51, feedbacks: 11)
- Orphan records: 0
```

---

## 6. Final Real Inference Verification

A rigorous, live end-to-end verification of Phase 6 was executed to validate that the ML inference pipeline is fully functional and not a stub.

### 1. Existing Model Verification
* **Model Path**: `smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl`
* **Verified SHA256**: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43` (Identical, untouched)
* **SQLite Source Database**: `smartTariff-backend-main/smarttariff.db`
* **Verified SHA256**: `1D3A9970F68790A913851736F4635EF0C7FE16C49CC01825BDAA267373F5737D` (Identical, untouched)

### 2. Model Contract
* **Model Class/Type**: `RandomForestRegressor`
* **n_features_in_**: `11`
* **Features (Exact Order)**:
  1. `data_per_month_gb`
  2. `sms_per_month`
  3. `monthly_equivalent_inr`
  4. `duration_months`
  5. `discount_percent`
  6. `data_coverage_ratio`
  7. `sms_coverage_ratio`
  8. `data_waste_ratio`
  9. `sms_waste_ratio`
  10. `price_to_budget_ratio`
  11. `duration_match`
* **Preprocessing Requirements**: Feature vector is prepared as an 11-element floating point array in the exact order above. Categorical durations and plan features are normalized numerically.

### 3. Python ML Microservice Execution
* **GET `/health`**:
  - HTTP Status: `200 OK`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "status": "ok",
        "model_loaded": true
      }
    }
    ```
* **GET `/model-status`**:
  - HTTP Status: `200 OK`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "status": "active",
        "model_loaded": true,
        "model_type": "RandomForestRegressor",
        "model_name": "SmartTariff V4.3 (size-controlled)",
        "version": "SmartTariff V4.3 (size-controlled)",
        "n_features": 11,
        "features": [
          "data_per_month_gb",
          "sms_per_month",
          "monthly_equivalent_inr",
          "duration_months",
          "discount_percent",
          "data_coverage_ratio",
          "sms_coverage_ratio",
          "data_waste_ratio",
          "sms_waste_ratio",
          "price_to_budget_ratio",
          "duration_match"
        ],
        "training_customers": 30000,
        "plans_configured": 20
      }
    }
    ```
* **POST `/predict` (Realistic 11-Feature Payload)**:
  - Request:
    ```json
    {
      "data_per_month_gb": 45.0,
      "sms_per_month": 40.0,
      "monthly_equivalent_inr": 499.0,
      "duration_months": 1.0,
      "discount_percent": 0.0,
      "data_coverage_ratio": 1.5,
      "sms_coverage_ratio": 2.5,
      "data_waste_ratio": 0.33,
      "sms_waste_ratio": 0.6,
      "price_to_budget_ratio": 0.998,
      "duration_match": 1.0
    }
    ```
  - HTTP Status: `200 OK`
  - Response:
    ```json
    {
      "success": true,
      "data": {
        "prediction": 88.40040036402071,
        "bounded_score": 88
      }
    }
    ```

### 4. Node.js Backend Integration
A live recommendation generation call was dispatched from Node.js (`recommendationService.generateRecommendations(2)` for customer Rahul Sharma):
* **HTTP Call**: Node.js evaluated active tariff plans against the customer usage profile and dispatched candidate inference to `http://127.0.0.1:8000/predict`.
* **Output Tag**: `"generatedBy": "ml"`
* **Top-3 Recommended Plans & Explainability Reasons**:
  - **Rank 1**: Plan ID 6 (`Smart Plus`) | **Score: 94**
    - *Reasons*:
      - "Matches your 1-Month plan preference"
      - "Matches your 60 GB monthly data needs"
      - "Fits your monthly budget"
      - "Unlimited voice calling included"
      - "5G ready high-speed network"
  - **Rank 2**: Plan ID 8 (`Stream 100`) | **Score: 89**
    - *Reasons*:
      - "Matches your 1-Month plan preference"
      - "Matches your 150 GB monthly data needs"
      - "Fits your monthly budget"
      - "Unlimited voice calling included"
      - "5G ready high-speed network"
  - **Rank 3**: Plan ID 9 (`Premium Pro`) | **Score: 88**
    - *Reasons*:
      - "Matches your 1-Month plan preference"
      - "Matches your 200 GB monthly data needs"
      - "Close to your target monthly budget"
      - "Unlimited voice calling included"
      - "5G ready high-speed network"
* *Cleanup*: The transient test record generated during the check was immediately cleaned up and sequence counters were synchronized to preserve exact data counts.

### 5. Fallback Verification
Simulated an offline/unreachable ML service by configuring `ML_SERVICE_URL` to an unreachable port (`http://127.0.0.1:59999`):
* The request did **NOT** crash.
* Node.js detected network unreachable error and caught the exception cleanly.
* Seamlessly switched to deterministic rule-based scoring:
  - **Output Tag**: `"generatedBy": "rule-based"`
  - **HTTP Status**: `200 OK`
  - **Top-3 Plans Generated**:
    - Rank 1: Plan ID 6 (`Smart Plus`) | Score: 98
    - Rank 2: Plan ID 7 (`Stream 60`) | Score: 91
    - Rank 3: Plan ID 8 (`Stream 100`) | Score: 90
* *Cleanup*: Transient fallback test record was immediately removed and sequences re-synced.

### 6. Invalid Response Handling
Tested malformed and invalid payloads dispatched to the microservice:
* Microservice returned validation error (`422/400`).
* Node.js `mlService.getRecommendations()` safely caught the failure and returned `null`.
* Node.js backend proceeded to rule-based fallback without throwing unhandled exceptions.

### 7. Database Integrity Verification
PostgreSQL database state was verified using `verify_pg_data.js`:
* `users`: **21**
* `customer_profiles`: **20**
* `tariff_plans`: **20**
* `usages`: **73**
* `recommendations`: **17**
* `recommendation_plans`: **51**
* `feedbacks`: **11**
* **Total Records**: **213**
* **Orphan Records**: **0**

### 8. Final Verification Status Table

| Check | Status | Evidence / Remarks |
|---|---|---|
| **MODEL LOAD** | **PASS** | `RandomForestRegressor` successfully loaded into memory from `smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl` |
| **REAL `/predict`** | **PASS** | Real inference returned numeric score `88.4004` (bounded integer: 88) on valid 11-feature input vector |
| **NODE → PYTHON** | **PASS** | Node.js successfully called microservice over HTTP; generated top-3 recommendations tagged `"generatedBy": "ml"` |
| **FALLBACK** | **PASS** | When microservice is offline, Node.js automatically falls back to rule-based scoring (`"generatedBy": "rule-based"`) with 200 response |
| **INVALID RESPONSE HANDLING** | **PASS** | Malformed requests safely caught; Node.js falls back cleanly without server crash |
| **DATABASE INTEGRITY** | **PASS** | Exactly 213 rows across all 7 tables; 0 orphan records; sequences aligned |
| **MODEL HASH** | **PASS** | SHA256 remains identical: `33584B486542A5DE902696FC2D2DDD98ED6AE7223D3771537D713600F55D9B43` |
| **OLD SYSTEM INTEGRITY** | **PASS** | SQLite (`smarttariff.db`), FastAPI backend, and React frontend remain 100% untouched |

