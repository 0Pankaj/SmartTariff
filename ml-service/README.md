# SmartTariff Python ML Inference Microservice

Standalone Python FastAPI microservice that loads the existing SmartTariff V4.3 Random Forest Regressor (`smarttariff_v4_3_random_forest.pkl`) and exposes HTTP endpoints for real-time model inference and metadata.

## Service Ports & Environment
- **Default Port**: `8000`
- **Host**: `0.0.0.0`
- **Model Path**: `../smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl`
- **Config Path**: `../smartTariff-backend-main/smarttariff_v4_3_config.json`

## Endpoints

### 1. `GET /health`
Returns runtime service status and boolean indicator of whether the `.pkl` artifact is loaded into memory:
```json
{
  "success": true,
  "data": {
    "status": "ok",
    "model_loaded": true
  }
}
```

### 2. `GET /model-status`
Returns safe model metadata, feature count, and feature names:
```json
{
  "success": true,
  "data": {
    "status": "active",
    "model_loaded": true,
    "model_type": "RandomForestRegressor",
    "model_name": "SmartTariff V4.3 (size-controlled)",
    "version": "4.3.0",
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

### 3. `POST /predict`
Accepts either:
- A single 11-feature vector payload:
```json
{
  "data_per_month_gb": 100.0,
  "sms_per_month": 100.0,
  "monthly_equivalent_inr": 450.0,
  "duration_months": 1.0,
  "discount_percent": 0.0,
  "data_coverage_ratio": 1.25,
  "sms_coverage_ratio": 1.0,
  "data_waste_ratio": 0.2,
  "sms_waste_ratio": 0.0,
  "price_to_budget_ratio": 0.9,
  "duration_match": 1.0
}
```
- Or a complete recommendation candidate payload:
```json
{
  "customer": { ... },
  "usage": { ... },
  "plans": [ ... ]
}
```

## Running the Microservice
```bash
cd ml-service
.\venv\Scripts\uvicorn.exe app.main:app --host 0.0.0.0 --port 8000
```
