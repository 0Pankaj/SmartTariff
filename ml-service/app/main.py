"""
ml-service/app/main.py
FastAPI standalone application for SmartTariff Python ML Inference Microservice.
"""
from typing import Any, Dict
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError
from .model import load_model, get_model_metadata
from .schemas import SinglePredictionInput, RecommendationRequestPayload
from .predictor import predict_single_vector, predict_recommendations

app = FastAPI(
    title="SmartTariff ML Inference Service",
    description="Standalone Python microservice serving the SmartTariff V4.3 Random Forest Regressor",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup_event():
    model = load_model()
    if model is None:
        print("[ML Service] WARNING: Model artifact could not be loaded at startup.")
    else:
        print(f"[ML Service] Model successfully loaded into memory: {type(model).__name__}")


@app.get("/health")
def health_check():
    model = load_model()
    is_loaded = model is not None
    return {
        "success": True,
        "data": {
            "status": "ok",
            "model_loaded": is_loaded,
        },
    }


@app.get("/model-status")
def model_status():
    metadata = get_model_metadata()
    return {
        "success": True,
        "data": metadata,
    }


@app.post("/predict")
def predict(payload: Dict[str, Any]):
    model = load_model()
    if model is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ML model is currently unavailable or could not be loaded.",
        )

    # Distinguish between Single 11-feature vector vs Recommendation payload
    # 1. Check if payload represents recommendation payload (contains "plans" or "customer" or "usage")
    if "plans" in payload or ("customer" in payload and "usage" in payload):
        try:
            rec_payload = RecommendationRequestPayload(**payload)
            result = predict_recommendations(rec_payload)
            return {
                "success": True,
                "data": result,
            }
        except ValidationError as ve:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ve.errors())
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    # 2. Otherwise validate strictly as SinglePredictionInput (11 features)
    try:
        single_input = SinglePredictionInput(**payload)
        score = predict_single_vector(single_input)
        return {
            "success": True,
            "data": {
                "prediction": score,
                "bounded_score": max(0, min(100, int(round(score)))),
            },
        }
    except ValidationError as ve:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=ve.errors())
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
