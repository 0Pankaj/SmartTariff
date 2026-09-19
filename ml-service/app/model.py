"""
ml-service/app/model.py
Safe model loader and configuration manager.
"""
import json
import logging
import warnings
from typing import Any, Dict, List, Optional
import joblib
from .config import settings

# Suppress version mismatch unpickling warnings
warnings.filterwarnings("ignore")

logger = logging.getLogger("ml-service.model")

_MODEL_CACHE: Optional[Any] = None
_CONFIG_CACHE: Optional[Dict[str, Any]] = None

FEATURE_ORDER: List[str] = [
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
    "duration_match",
]


def load_config() -> Optional[Dict[str, Any]]:
    global _CONFIG_CACHE
    if _CONFIG_CACHE is not None:
        return _CONFIG_CACHE

    if settings.CONFIG_PATH.exists() and settings.CONFIG_PATH.is_file():
        try:
            with open(settings.CONFIG_PATH, "r", encoding="utf-8") as f:
                _CONFIG_CACHE = json.load(f)
                return _CONFIG_CACHE
        except Exception as e:
            logger.warning(f"Failed to read model config from {settings.CONFIG_PATH}: {e}")

    # Fallback to defaults
    _CONFIG_CACHE = {
        "model_version": "SmartTariff V4.3 (size-controlled)",
        "algorithm": "RandomForestRegressor",
        "features": FEATURE_ORDER,
        "training": {"customers": 30000, "plans": 20},
    }
    return _CONFIG_CACHE


def load_model() -> Optional[Any]:
    global _MODEL_CACHE
    if _MODEL_CACHE is not None:
        return _MODEL_CACHE

    if not settings.MODEL_PATH.exists() or not settings.MODEL_PATH.is_file():
        logger.error(f"Model artifact not found at {settings.MODEL_PATH}")
        return None

    try:
        loaded = joblib.load(str(settings.MODEL_PATH))
        _MODEL_CACHE = loaded
        logger.info(f"Loaded {type(loaded).__name__} from {settings.MODEL_PATH.name}")
        return _MODEL_CACHE
    except Exception as e:
        logger.error(f"Failed to deserialize model artifact at {settings.MODEL_PATH}: {e}")
        return None


def get_model_metadata() -> Dict[str, Any]:
    model = load_model()
    cfg = load_config() or {}

    is_loaded = model is not None
    features = cfg.get("features", FEATURE_ORDER)

    return {
        "status": "active" if is_loaded else "unavailable",
        "model_loaded": is_loaded,
        "model_type": type(model).__name__ if is_loaded else None,
        "model_name": cfg.get("model_version", "SmartTariff V4.3"),
        "version": cfg.get("model_version", "4.3.0"),
        "n_features": len(features),
        "features": features,
        "training_customers": cfg.get("training", {}).get("customers", 30000),
        "plans_configured": cfg.get("training", {}).get("plans", 20),
    }
