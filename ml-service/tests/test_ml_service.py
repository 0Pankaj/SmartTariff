"""
Unit tests for Python ML microservice.
Tests:
1. model loads successfully
2. GET /health
3. GET /model-status
4. valid POST /predict (11-feature vector)
5. valid POST /predict (recommendation payload)
6. missing feature validation
7. invalid numeric input
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.model import load_model, FEATURE_ORDER

client = TestClient(app)


def test_1_model_loads_successfully():
    model = load_model()
    assert model is not None
    assert type(model).__name__ == "RandomForestRegressor"
    assert getattr(model, "n_features_in_", None) == 11


def test_2_get_health():
    res = client.get("/health")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["status"] == "ok"
    assert data["data"]["model_loaded"] is True


def test_3_get_model_status():
    res = client.get("/model-status")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["data"]["model_loaded"] is True
    assert data["data"]["n_features"] == 11
    assert data["data"]["features"] == FEATURE_ORDER


def test_4_valid_post_predict_vector():
    payload = {
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
        "duration_match": 1.0,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert "prediction" in data["data"]
    assert 0 <= data["data"]["bounded_score"] <= 100


def test_5_valid_post_predict_recommendations():
    payload = {
        "customer": {
            "customerId": "1",
            "monthlyBudget": 500.0,
            "minimumData": 25.0,
            "minimumCallMinutes": 400.0,
            "minimumSms": 100.0,
            "preferredDuration": "28",
            "requires5G": False,
        },
        "usage": {
            "dataUsage": 20.0,
            "callMinutes": 350.0,
            "smsCount": 80.0,
        },
        "plans": [
            {
                "planId": 1,
                "planCode": "P01",
                "name": "Basic Plan",
                "price": 199.0,
                "monthlyEquivalent": 199.0,
                "durationMonths": 1,
                "validity": 28,
                "dataLimit": 2.0,
                "callMinutes": 300.0,
                "smsLimit": 50.0,
                "fiveG": False,
            },
            {
                "planId": 5,
                "planCode": "P05",
                "name": "Smart Daily",
                "price": 370.0,
                "monthlyEquivalent": 370.0,
                "durationMonths": 1,
                "validity": 28,
                "dataLimit": 45.0,
                "callMinutes": 500.0,
                "smsLimit": 100.0,
                "fiveG": True,
            },
        ],
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    recs = data["data"]["recommendations"]
    assert len(recs) > 0
    assert recs[0]["rank"] == 1
    assert "score" in recs[0]
    assert len(recs[0]["reasons"]) > 0


def test_6_missing_feature_validation():
    # Incomplete 11-feature payload
    payload = {
        "data_per_month_gb": 100.0,
        "sms_per_month": 100.0,
        # missing remaining features
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 400


def test_7_invalid_numeric_input():
    payload = {
        "data_per_month_gb": -10.0,  # invalid negative
        "sms_per_month": 100.0,
        "monthly_equivalent_inr": 450.0,
        "duration_months": 1.0,
        "discount_percent": 0.0,
        "data_coverage_ratio": 1.25,
        "sms_coverage_ratio": 1.0,
        "data_waste_ratio": 0.2,
        "sms_waste_ratio": 0.0,
        "price_to_budget_ratio": 0.9,
        "duration_match": 1.0,
    }
    res = client.post("/predict", json=payload)
    assert res.status_code == 400
