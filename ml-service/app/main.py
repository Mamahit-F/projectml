from datetime import datetime
from typing import Any, Dict, List, Optional

from fastapi import Depends, FastAPI, File, Header, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.config import ML_API_SECRET_KEY, ML_CORS_ALLOWED_ORIGINS
from app.ml.pipeline import (
    compare_models,
    get_clusters_view,
    get_dataset_quality,
    get_dataset_summary,
    get_evaluation_overview,
    get_ml_status,
    get_students_continuity,
    predict_batch_students,
    predict_for_student,
    process_historical_data,
    train_all_pipelines,
    train_clustering_pipeline,
    train_supervised_pipeline,
)
from app.ml.registry import load_registry, select_active_model
from app.pdf_parser import parse_points_pdf
from app.risk_analyzer import analyze_student_risks

app = FastAPI(
    title="StudentInsight Historical ML & PDF Service",
    description=(
        "Historical PDF/Excel extraction, student continuity tracking, unsupervised clustering, "
        "temporal supervised point prediction, and versioned model management for Universitas Klabat."
    ),
    version="3.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ML_CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-ML-API-Key"],
)


def verify_api_key(x_ml_api_key: Optional[str] = Header(default=None, alias="X-ML-API-Key")) -> None:
    """Protect /ml/* endpoints when API_SECRET_KEY is configured in the environment."""
    if ML_API_SECRET_KEY and x_ml_api_key != ML_API_SECRET_KEY:
        raise HTTPException(status_code=401, detail="Invalid or missing X-ML-API-Key header.")


# ======================== EXISTING SCHEMAS (PRESERVED) ========================
class PointHistoryItem(BaseModel):
    report_date: str
    sabbath_points: int


class StudentRiskInput(BaseModel):
    student_id: Optional[int] = None
    nim: str
    study_program: Optional[str] = None
    sabbath_points: int = Field(..., ge=0)
    points_delta: int = 0
    history: Optional[List[PointHistoryItem]] = None


class BatchRiskAnalyzeRequest(BaseModel):
    report_date: Optional[str] = None
    semester_start_date: Optional[str] = None
    attendance_cutoff_date: Optional[str] = None
    final_point_limit: Optional[int] = None
    attendance_closed: bool = False
    students: List[StudentRiskInput]


# ======================== NEW HISTORICAL ML SCHEMAS ========================
class ProcessDataRequest(BaseModel):
    data_dir: Optional[str] = None
    use_cache: bool = True


class TrainClusteringRequest(BaseModel):
    dataset_version: Optional[str] = None
    k_min: int = Field(default=2, ge=2, le=10)
    k_max: int = Field(default=8, ge=2, le=12)
    preferred_k: Optional[int] = Field(default=None, ge=2, le=12)
    include_alternatives: bool = True
    random_state: int = 42
    auto_select_if_none: bool = False


class ThresholdConfig(BaseModel):
    low_max: float = Field(..., ge=0)
    medium_max: float = Field(..., gt=0)


class TrainPredictionRequest(BaseModel):
    dataset_version: Optional[str] = None
    task: str = Field(default="BOTH", pattern="^(BOTH|REGRESSION|CLASSIFICATION|both|regression|classification)$")
    algorithms: Optional[List[str]] = None
    custom_thresholds: Optional[ThresholdConfig] = None
    hyperparameters: Optional[Dict[str, Any]] = None
    random_state: int = 42
    auto_select_if_none: bool = False


class TrainAllRequest(BaseModel):
    data_dir: Optional[str] = None
    reprocess_data: bool = False
    auto_select_if_none: bool = False


class SelectModelRequest(BaseModel):
    model_id: str = Field(..., min_length=3)
    notes: Optional[str] = None


class PredictStudentRequest(BaseModel):
    nim: Optional[str] = None
    internal_student_id: Optional[str] = None
    next_is_same_semester: bool = False
    expected_days_to_next: int = Field(default=120, ge=1, le=365)
    allow_inactive_preview: bool = False


class PredictBatchRequest(BaseModel):
    nims: Optional[List[str]] = None
    next_is_same_semester: bool = False
    expected_days_to_next: int = Field(default=120, ge=1, le=365)
    limit: int = Field(default=100, ge=1, le=500)


# ======================== EXISTING ENDPOINTS (100% COMPATIBLE) ========================
@app.get("/health")
def health_check():
    status_info = get_ml_status()
    return {
        "status": "UP",
        "service": "studentinsight-ml-service",
        "version": "3.0.0",
        "timestamp": datetime.now().isoformat(),
        "dataset_ready": status_info["dataset_ready"],
        "latest_dataset_version": status_info["latest_dataset_version"],
        "capabilities": [
            "pdf_parsing",
            "xlsx_parsing",
            "dynamic_kmeans_clustering",
            "semester_projection",
            "historical_continuity_tracking",
            "unsupervised_profile_clustering",
            "temporal_supervised_prediction",
            "versioned_model_registry",
        ],
    }


@app.get("/model/info")
def model_info():
    return {
        "model_name": "DynamicKMeansRiskAnalyzer",
        "model_version": "2.0",
        "methodology": "Unsupervised K-Means Dynamic Clustering + Semester Cutoff Trend Projection",
        "target_classes": ["SAFE", "LOW", "MEDIUM", "HIGH"],
        "features": [
            "sabbath_points",
            "points_delta",
            "cohort_percentile",
            "semester_timeline_projection",
        ],
        "selection_reason": (
            "Universitas Klabat does not enforce static mid-semester point cutoffs; "
            "dynamic clustering adapts automatically to each PDF snapshot distribution "
            "while projecting points toward the official attendance cutoff date."
        ),
    }


@app.post("/parse-pdf", dependencies=[Depends(verify_api_key)])
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File harus berformat PDF (.pdf).")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File PDF kosong.")

    try:
        return parse_points_pdf(content, filename=file.filename)
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca dokumen PDF: {str(e)}")


@app.post("/analyze-risk", dependencies=[Depends(verify_api_key)])
def analyze_risk_endpoint(req: BatchRiskAnalyzeRequest):
    try:
        return analyze_student_risks(req.model_dump())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analisis risiko gagal: {str(e)}")


# ======================== NEW HISTORICAL ML SUBSYSTEM ENDPOINTS ========================
@app.get("/ml/status", dependencies=[Depends(verify_api_key)])
def ml_status_endpoint():
    return get_ml_status()


@app.get("/ml/dataset/summary", dependencies=[Depends(verify_api_key)])
def ml_dataset_summary_endpoint(dataset_version: Optional[str] = Query(default=None)):
    try:
        return get_dataset_summary(dataset_version=dataset_version)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@app.get("/ml/dataset/quality", dependencies=[Depends(verify_api_key)])
def ml_dataset_quality_endpoint(dataset_version: Optional[str] = Query(default=None)):
    try:
        return get_dataset_quality(dataset_version=dataset_version)
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@app.get("/ml/students/continuity", dependencies=[Depends(verify_api_key)])
def ml_students_continuity_endpoint(
    dataset_version: Optional[str] = Query(default=None),
    status: Optional[str] = Query(default=None),
    search: Optional[str] = Query(default=None),
    faculty: Optional[str] = Query(default=None),
    eligible_for: Optional[str] = Query(default=None),
    page: int = Query(default=0, ge=0),
    size: int = Query(default=50, ge=1, le=500),
):
    try:
        return get_students_continuity(
            dataset_version=dataset_version,
            status=status,
            search=search,
            faculty=faculty,
            eligible_for=eligible_for,
            page=page,
            size=size,
        )
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@app.post("/ml/process-data", dependencies=[Depends(verify_api_key)])
def ml_process_data_endpoint(req: ProcessDataRequest = ProcessDataRequest()):
    res = process_historical_data(data_dir=req.data_dir, use_cache=req.use_cache)
    if res.get("status") != "SUCCESS":
        raise HTTPException(status_code=422, detail=res.get("error", "Pemrosesan dataset gagal."))
    return res


@app.post("/ml/train/clustering", dependencies=[Depends(verify_api_key)])
def ml_train_clustering_endpoint(req: TrainClusteringRequest = TrainClusteringRequest()):
    try:
        return train_clustering_pipeline(
            dataset_version=req.dataset_version,
            k_min=req.k_min,
            k_max=req.k_max,
            preferred_k=req.preferred_k,
            include_alternatives=req.include_alternatives,
            random_state=req.random_state,
            auto_select_if_none=req.auto_select_if_none,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pelatihan clustering gagal: {str(e)}")


@app.post("/ml/train/prediction", dependencies=[Depends(verify_api_key)])
def ml_train_prediction_endpoint(req: TrainPredictionRequest = TrainPredictionRequest()):
    try:
        return train_supervised_pipeline(
            dataset_version=req.dataset_version,
            task=req.task.upper(),
            algorithms=req.algorithms,
            custom_thresholds=req.custom_thresholds.model_dump() if req.custom_thresholds else None,
            hyperparameters=req.hyperparameters,
            random_state=req.random_state,
            auto_select_if_none=req.auto_select_if_none,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pelatihan prediksi supervised gagal: {str(e)}")


@app.post("/ml/train/all", dependencies=[Depends(verify_api_key)])
def ml_train_all_endpoint(req: TrainAllRequest = TrainAllRequest()):
    try:
        return train_all_pipelines(
            data_dir=req.data_dir,
            reprocess_data=req.reprocess_data,
            auto_select_if_none=req.auto_select_if_none,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Pelatihan penuh ML gagal: {str(e)}")


@app.get("/ml/models", dependencies=[Depends(verify_api_key)])
def ml_list_models_endpoint(model_type: Optional[str] = Query(default=None)):
    reg = load_registry()
    models = reg.get("models", [])
    if model_type:
        models = [m for m in models if m["model_type"] == model_type.upper()]
    return {
        "total": len(models),
        "selected_models": reg.get("selected_models", {}),
        "models": list(reversed(models)),
    }


@app.get("/ml/models/compare", dependencies=[Depends(verify_api_key)])
def ml_compare_models_endpoint(model_type: Optional[str] = Query(default=None)):
    return compare_models(model_type=model_type)


@app.get("/ml/models/selected", dependencies=[Depends(verify_api_key)])
def ml_selected_models_endpoint():
    reg = load_registry()
    selected = {}
    for mtype, mid in reg.get("selected_models", {}).items():
        selected[mtype] = next((m for m in reg.get("models", []) if m["model_id"] == mid), None) if mid else None
    return {"selected_models": selected}


@app.post("/ml/models/select", dependencies=[Depends(verify_api_key)])
def ml_select_model_endpoint(req: SelectModelRequest):
    try:
        activated = select_active_model(req.model_id, notes=req.notes)
        return {"status": "SELECTED", "model": activated}
    except ValueError as ve:
        raise HTTPException(status_code=404, detail=str(ve))


@app.post("/ml/predict", dependencies=[Depends(verify_api_key)])
def ml_predict_endpoint(req: PredictStudentRequest):
    try:
        return predict_for_student(
            nim=req.nim,
            internal_student_id=req.internal_student_id,
            next_is_same_semester=req.next_is_same_semester,
            expected_days_to_next=req.expected_days_to_next,
            allow_inactive_preview=req.allow_inactive_preview,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except FileNotFoundError as fnf:
        raise HTTPException(status_code=503, detail=str(fnf))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediksi gagal: {str(e)}")


@app.post("/ml/predict/batch", dependencies=[Depends(verify_api_key)])
def ml_predict_batch_endpoint(req: PredictBatchRequest = PredictBatchRequest()):
    try:
        return predict_batch_students(
            nims=req.nims,
            next_is_same_semester=req.next_is_same_semester,
            expected_days_to_next=req.expected_days_to_next,
            limit=req.limit,
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediksi batch gagal: {str(e)}")


@app.get("/ml/training/history", dependencies=[Depends(verify_api_key)])
def ml_training_history_endpoint():
    reg = load_registry()
    runs = list(reversed(reg.get("training_runs", [])))
    return {
        "total": len(runs),
        "dataset_versions": list(reversed(reg.get("dataset_versions", []))),
        "training_runs": runs,
    }


@app.get("/ml/clusters", dependencies=[Depends(verify_api_key)])
def ml_clusters_endpoint(
    model_id: Optional[str] = Query(default=None),
    sample_limit: int = Query(default=400, ge=50, le=2000),
):
    return get_clusters_view(model_id=model_id, sample_limit=sample_limit)


@app.get("/ml/evaluation", dependencies=[Depends(verify_api_key)])
def ml_evaluation_endpoint():
    return get_evaluation_overview()
