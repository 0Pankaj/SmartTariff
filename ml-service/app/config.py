"""
ml-service/app/config.py
Configuration loader for SmartTariff Python ML Inference Microservice.
"""
import os
from pathlib import Path
from dotenv import load_dotenv

env_path = Path(__file__).resolve().parent.parent / ".env"
if env_path.exists():
    load_dotenv(dotenv_path=env_path)
else:
    load_dotenv()

# Workspace directory is parent of ml-service
WORKSPACE_DIR = Path(__file__).resolve().parent.parent.parent


def resolve_path(env_var_name: str, default_rel: str) -> Path:
    raw = os.getenv(env_var_name, default_rel)
    p = Path(raw)
    if p.is_absolute() and p.exists():
        return p
    # Try resolving relative to ml-service folder
    ml_service_dir = Path(__file__).resolve().parent.parent
    if (ml_service_dir / p).exists():
        return (ml_service_dir / p).resolve()
    # Try resolving relative to workspace directory
    if (WORKSPACE_DIR / p).exists():
        return (WORKSPACE_DIR / p).resolve()
    # Default fallback
    return (WORKSPACE_DIR / default_rel).resolve()


class Settings:
    PORT: int = int(os.getenv("PORT", "8000"))
    HOST: str = os.getenv("HOST", "0.0.0.0")

    MODEL_PATH: Path = resolve_path(
        "MODEL_PATH",
        "smartTariff-backend-main/smarttariff_v4_3_random_forest.pkl"
    )

    CONFIG_PATH: Path = resolve_path(
        "CONFIG_PATH",
        "smartTariff-backend-main/smarttariff_v4_3_config.json"
    )


settings = Settings()
