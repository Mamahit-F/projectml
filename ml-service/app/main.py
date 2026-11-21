import os
import json
from typing import Any, Dict, List, Optional
from datetime import datetime

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.pdf_parser import parse_points_pdf
from app.risk_analyzer import analyze_student_risks

app = FastAPI(
    title="StudentInsight PDF & Dynamic ML Service",
    description="PDF extraction and dynamic clustering/projection risk analysis service for Universitas Klabat",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


@app.get("/health")
def health_check():
    return {
        "status": "UP",
        "service": "studentinsight-ml-service",
        "version": "2.0.0",
        "timestamp": datetime.now().isoformat(),
        "capabilities": ["pdf_parsing", "dynamic_kmeans_clustering", "semester_projection"],
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


@app.post("/parse-pdf")
async def parse_pdf_endpoint(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="File harus berformat PDF (.pdf).")

    content = await file.read()
    if not content:
        raise HTTPException(status_code=400, detail="File PDF kosong.")

    try:
        parsed = parse_points_pdf(content, filename=file.filename)
        return parsed
    except ValueError as ve:
        raise HTTPException(status_code=422, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal membaca dokumen PDF: {str(e)}")


@app.post("/analyze-risk")
def analyze_risk_endpoint(req: BatchRiskAnalyzeRequest):
    try:
        payload = req.model_dump()
        return analyze_student_risks(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analisis risiko gagal: {str(e)}")
