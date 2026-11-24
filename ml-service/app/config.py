import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

# Default historical PDF/XLSX directory (read-only source of truth)
DEFAULT_HISTORICAL_DIR = Path(
    os.getenv(
        "HISTORICAL_DATA_DIR",
        str(BASE_DIR.parent.parent / "Data Poin Mahasiswa"),
    )
)

# Persistent artifacts directory (models, datasets, extraction cache, registry)
ARTIFACTS_DIR = Path(
    os.getenv(
        "ML_ARTIFACTS_DIR",
        str(BASE_DIR / "artifacts"),
    )
)

EXTRACTION_CACHE_DIR = ARTIFACTS_DIR / "extraction_cache"
DATASETS_DIR = ARTIFACTS_DIR / "datasets"
MODELS_DIR = ARTIFACTS_DIR / "models"
REGISTRY_FILE = ARTIFACTS_DIR / "registry.json"

# Optional API key for service-to-service authentication between Spring Boot and FastAPI
ML_API_SECRET_KEY = os.getenv("API_SECRET_KEY", "").strip()

# Allowed CORS origins (comma-separated) — restrict to trusted origins in production
ML_CORS_ALLOWED_ORIGINS = [
    o.strip()
    for o in os.getenv(
        "ML_CORS_ALLOWED_ORIGINS",
        "http://localhost:8080,http://localhost:5173,http://localhost:3000,http://127.0.0.1:8080,http://127.0.0.1:5173",
    ).split(",")
    if o.strip()
]

# Reproducibility seed
RANDOM_STATE = int(os.getenv("ML_RANDOM_STATE", "42"))


def ensure_artifact_dirs() -> None:
    for d in (ARTIFACTS_DIR, EXTRACTION_CACHE_DIR, DATASETS_DIR, MODELS_DIR):
        d.mkdir(parents=True, exist_ok=True)
