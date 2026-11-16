import pytest
import os
import json
import joblib
import pandas as pd
from fastapi.testclient import TestClient

from app.main import app, load_model_and_meta

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_model():
    load_model_and_meta()

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "UP"
    assert data["model_loaded"] is True

def test_model_info_endpoint():
    response = client.get("/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "model_name" in data
    assert "evaluation_summary" in data
    assert len(data["classes"]) == 3

def test_predict_low_risk_student():
    payload = {
        "residence_category": "OUTSIDER_DEKAT",
        "required_attendance": 24,
        "present_count": 23,
        "absence_count": 1,
        "attendance_rate": 95.8,
        "consecutive_absences": 0,
        "previous_violation_points": 0,
        "wop_attendance_rate": 100.0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_category"] in ["LOW", "MEDIUM", "HIGH"]
    assert "probabilities" in data
    assert "LOW" in data["probabilities"]
    # For a student with 95.8% attendance and 0 points, LOW probability should be dominant
    assert data["probabilities"]["LOW"] > data["probabilities"]["HIGH"]

def test_predict_high_risk_student():
    payload = {
        "residence_category": "OUTSIDER_JAUH",
        "required_attendance": 12,
        "present_count": 3,
        "absence_count": 9,
        "attendance_rate": 25.0,
        "consecutive_absences": 4,
        "previous_violation_points": 35,
        "wop_attendance_rate": 20.0
    }
    response = client.post("/predict", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["risk_category"] in ["MEDIUM", "HIGH"]
    assert data["probabilities"]["HIGH"] > 0.40

def test_retrain_unauthorized():
    response = client.post("/retrain", headers={"X-API-Key": "wrong-key"})
    assert response.status_code == 403
