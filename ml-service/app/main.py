import os
import json
import joblib
import pandas as pd
from typing import Dict, Any, Optional
from datetime import datetime

from fastapi import FastAPI, HTTPException, Header, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Model & Metadata paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODELS_DIR = os.path.join(BASE_DIR, "models")
MODEL_PATH = os.path.join(MODELS_DIR, "best_model.joblib")
META_PATH = os.path.join(MODELS_DIR, "model_metadata.json")

API_SECRET_KEY = os.getenv("API_SECRET_KEY", "studentinsight-ml-secret-key-2026")

app = FastAPI(
    title="StudentInsight ML Prediction Service",
    description="Machine Learning service for predicting student disciplinary risks at Universitas Klabat",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global model state
best_model = None
model_metadata = {}

def load_model_and_meta():
    global best_model, model_metadata
    if os.path.exists(MODEL_PATH) and os.path.exists(META_PATH):
        best_model = joblib.load(MODEL_PATH)
        with open(META_PATH, "r") as f:
            model_metadata = json.load(f)
        print(f"Loaded ML model: {model_metadata.get('model_name')} v{model_metadata.get('model_version')}")
    else:
        print("Model file not found. Auto-training now...")
        from scripts.train_and_evaluate import train_and_evaluate
        model_metadata = train_and_evaluate()
        best_model = joblib.load(MODEL_PATH)

@app.on_event("startup")
def on_startup():
    load_model_and_meta()

class PredictRequest(BaseModel):
    student_id: Optional[int] = None
    residence_category: str = Field(..., example="OUTSIDER_DEKAT")
    required_attendance: int = Field(..., ge=0, example=20)
    present_count: int = Field(..., ge=0, example=15)
    absence_count: int = Field(..., ge=0, example=5)
    attendance_rate: float = Field(..., ge=0.0, le=100.0, example=75.0)
    consecutive_absences: int = Field(..., ge=0, example=2)
    previous_violation_points: int = Field(..., ge=0, example=10)
    wop_attendance_rate: float = Field(..., ge=0.0, le=100.0, example=80.0)

class PredictResponse(BaseModel):
    risk_category: str
    probabilities: Dict[str, float]
    model_name: str
    model_version: str

@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "studentinsight-ml-service",
        "timestamp": datetime.now().isoformat(),
        "model_loaded": best_model is not None
    }

@app.get("/model/info")
def model_info():
    if not model_metadata:
        raise HTTPException(status_code=503, detail="Model metadata is unavailable")
    return {
        "model_name": model_metadata.get("model_name"),
        "model_version": model_metadata.get("model_version"),
        "training_date": model_metadata.get("training_date"),
        "features": model_metadata.get("features"),
        "classes": model_metadata.get("target_classes"),
        "selection_reason": model_metadata.get("selection_reason"),
        "evaluation_summary": model_metadata.get("evaluation_summary")
    }

@app.post("/predict", response_model=PredictResponse)
def predict_risk(req: PredictRequest):
    global best_model
    if best_model is None:
        load_model_and_meta()
    if best_model is None:
        raise HTTPException(status_code=503, detail="Model is currently not loaded")

    # Format into DataFrame with correct feature names
    input_df = pd.DataFrame([{
        "residence_category": req.residence_category.upper(),
        "required_attendance": req.required_attendance,
        "present_count": req.present_count,
        "absence_count": req.absence_count,
        "attendance_rate": req.attendance_rate,
        "consecutive_absences": req.consecutive_absences,
        "previous_violation_points": req.previous_violation_points,
        "wop_attendance_rate": req.wop_attendance_rate
    }])

    try:
        predicted_class = best_model.predict(input_df)[0]
        probs = best_model.predict_proba(input_df)[0]

        classes = best_model.classes_
        prob_dict = {
            cls: float(round(prob, 4)) for cls, prob in zip(classes, probs)
        }

        # Ensure all standard classes exist in dict
        for c in ["LOW", "MEDIUM", "HIGH"]:
            if c not in prob_dict:
                prob_dict[c] = 0.0

        return PredictResponse(
            risk_category=predicted_class,
            probabilities=prob_dict,
            model_name=model_metadata.get("model_name", "RandomForest"),
            model_version=model_metadata.get("model_version", "1.0")
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Inference error: {str(e)}")

@app.post("/retrain")
def retrain_model(x_api_key: Optional[str] = Header(None)):
    if x_api_key != API_SECRET_KEY:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Forbidden: Invalid or missing API key"
        )

    try:
        from scripts.train_and_evaluate import train_and_evaluate
        meta = train_and_evaluate()
        load_model_and_meta()
        return {
            "message": "Model retrained and reloaded successfully",
            "model_name": meta.get("model_name"),
            "training_date": meta.get("training_date")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Retraining failed: {str(e)}")
