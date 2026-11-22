import io
import zipfile
from pathlib import Path
import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.pdf_parser import (
    _normalize_prodi_and_first_name,
    _parse_table_row,
    parse_points_pdf,
)
from app.ml.extractor import parse_folder_date, scan_and_extract_directory
from app.ml.identity import normalize_person_name, resolve_student_identities
from app.ml.continuity import analyze_student_continuity
from app.ml.quality import run_data_quality_audit
from app.ml.features import (
    CLUSTERING_FEATURE_COLS,
    SUPERVISED_FEATURE_COLS,
    build_clustering_dataset,
    build_supervised_transition_dataset,
)
from app.ml.clustering import run_clustering_experiments
from app.ml.supervised import run_supervised_experiments
from app.ml.registry import load_registry, select_active_model

client = TestClient(app)


# ======================== 1. PDF & EXTRACTION TESTS ========================
def test_spilled_prodi_and_5col_pdf_parsing():
    # Spilled interleaved characters from real Keperawatan & Pertanian PDFs
    f1, p1 = _normalize_prodi_and_first_name("Dave Christian Chandraku", "suIlmmau Keperawatan")
    assert f1 == "Dave Christian Chandrakusuma"
    assert p1 == "Ilmu Keperawatan"

    f2, p2 = _normalize_prodi_and_first_name("Adventurous Princess Valeri", "faiAthgroteknologi")
    assert f2 == "Adventurous Princess Valerifaith"
    assert p2 == "Agroteknologi"

    f3, p3 = _normalize_prodi_and_first_name("Agnes", "I l m u K e p e r a w a t a n")
    assert p3 == "Ilmu Keperawatan"

    # 5-column layout WITHOUT PRODI must NOT misparse first_name as study_program
    col_map_5 = {"no": 0, "nim": 1, "last_name": 2, "first_name": 3, "points": 4}
    rec = _parse_table_row(["1", "NUMBER\nS22219008", "Adrian", "Aniesha Laura", "26"], col_map=col_map_5, default_prodi="Umum")
    assert rec is not None
    assert rec["nim"] == "S22219008"
    assert rec["full_name"] == "Aniesha Laura Adrian"
    assert rec["study_program"] == "Umum"
    assert rec["sabbath_points"] == 26


def test_pdf_extraction_handles_empty_and_corrupted_pdf():
    with pytest.raises(Exception):
        parse_points_pdf(b"", filename="empty.pdf")

    with pytest.raises(Exception):
        parse_points_pdf(b"%PDF-1.4 corrupted garbage bytes", filename="corrupted.pdf")


def test_directory_scan_handles_missing_and_empty_dirs(tmp_path: Path):
    missing = scan_and_extract_directory(tmp_path / "does_not_exist", use_cache=False)
    assert missing["status"] == "FAILED"

    empty_dir = tmp_path / "empty_root"
    empty_dir.mkdir()
    empty = scan_and_extract_directory(empty_dir, use_cache=False)
    assert empty["status"] == "EMPTY"

    assert parse_folder_date("20-11-2025").isoformat() == "2025-11-20"
    assert parse_folder_date("invalid-folder") is None


# ======================== 2. IDENTITY RESOLUTION TESTS ========================
def test_identity_matching_conflicts_missing_nim_and_duplicates():
    raw_records = [
        # Consistent student across 2 periods with minor name truncation
        {"raw_nim": "12410001", "student_name": "Budi Santoso Pratama", "faculty": "Fakultas Ilmu Komputer", "study_program": "Informatika", "reporting_date": "2025-11-20", "academic_semester": "2025-2026_SEM1", "total_points": 20, "source_file": "p1.xlsx"},
        {"raw_nim": "12410001", "student_name": "Budi Santoso Pratam", "faculty": "Fakultas Ilmu Komputer", "study_program": "Informatika", "reporting_date": "2026-03-09", "academic_semester": "2025-2026_SEM2", "total_points": 10, "source_file": "p2.pdf"},
        # Same student missing NIM in Period 3 -> cautious exact name match within same faculty
        {"raw_nim": "", "student_name": "Budi Santoso Pratama", "faculty": "Fakultas Ilmu Komputer", "study_program": "Umum", "reporting_date": "2026-04-29", "academic_semester": "2025-2026_SEM2", "total_points": 30, "source_file": "p3.pdf"},
        # Duplicate record for same student in same period
        {"raw_nim": "12410001", "student_name": "Budi Santoso Pratama", "faculty": "Fakultas Ilmu Komputer", "study_program": "Informatika", "reporting_date": "2026-04-29", "academic_semester": "2025-2026_SEM2", "total_points": 30, "source_file": "p3_dup.pdf"},
        # NIM-Name conflict (sort shift): NIM 12410002 is usually Maria, suddenly carries completely different name in p3!
        {"raw_nim": "12410002", "student_name": "Maria Christina", "faculty": "Fakultas Filsafat", "study_program": "Ilmu Filsafat", "reporting_date": "2025-11-20", "academic_semester": "2025-2026_SEM1", "total_points": 12, "source_file": "p1.xlsx"},
        {"raw_nim": "12410002", "student_name": "Maria Christina", "faculty": "Fakultas Filsafat", "study_program": "Ilmu Filsafat", "reporting_date": "2026-03-09", "academic_semester": "2025-2026_SEM2", "total_points": 16, "source_file": "p2.pdf"},
        {"raw_nim": "12410002", "student_name": "Jonathan Different Person", "faculty": "Fakultas Filsafat", "study_program": "Ilmu Filsafat", "reporting_date": "2026-04-29", "academic_semester": "2025-2026_SEM2", "total_points": 99, "source_file": "p3.pdf"},
        # Missing NIM with no match -> IDENTITY_UNCERTAIN
        {"raw_nim": "", "student_name": "Unknown Mystery Student", "faculty": "Fakultas Pertanian", "study_program": "Agroteknologi", "reporting_date": "2025-11-20", "academic_semester": "2025-2026_SEM1", "total_points": 5, "source_file": "p1.xlsx"},
    ]
    res = resolve_student_identities(raw_records)
    assert res["summary"]["nim_name_conflicts_count"] == 1
    assert res["summary"]["within_period_duplicates_count"] == 1
    assert res["summary"]["missing_nim_records_count"] == 2

    by_status = {}
    for r in res["records"]:
        by_status.setdefault(r["identity_status"], []).append(r)

    assert "IDENTITY_UNCERTAIN" in by_status
    # Both the NIM-name conflict row and unresolved missing-NIM row are quarantined
    assert len(by_status["IDENTITY_UNCERTAIN"]) == 2
    assert normalize_person_name("  Étha  Oktovina-Yewen! ") == "etha oktovina yewen"


# ======================== 3. CONTINUITY ENGINE TESTS ========================
def _make_rec(nim: str, name: str, date_str: str, sem: str, pts: int, status: str = "VERIFIED_BY_NIM"):
    return {
        "internal_student_id": f"STU-{nim}",
        "resolved_nim": nim,
        "canonical_student_name": name,
        "student_name": name,
        "faculty": "Fakultas Ilmu Komputer",
        "study_program": "Informatika",
        "reporting_date": date_str,
        "academic_semester": sem,
        "total_points": pts,
        "identity_status": status,
        "identity_warning": "Conflict" if status == "IDENTITY_UNCERTAIN" else None,
        "source_file": f"{date_str}.pdf",
    }


def test_student_continuity_all_seven_categories():
    periods = [
        {"period_index": 1, "folder_name": "20-11-2025", "reporting_date": "2025-11-20", "academic_semester": "2025-2026_SEM1"},
        {"period_index": 2, "folder_name": "09-03-2026", "reporting_date": "2026-03-09", "academic_semester": "2025-2026_SEM2"},
        {"period_index": 3, "folder_name": "29-04-2026", "reporting_date": "2026-04-29", "academic_semester": "2025-2026_SEM2"},
        {"period_index": 4, "folder_name": "01-10-2026", "reporting_date": "2026-10-01", "academic_semester": "2026-2027_SEM1"},
        {"period_index": 5, "folder_name": "06-11-2026", "reporting_date": "2026-11-06", "academic_semester": "2026-2027_SEM1"},
    ]
    d = [p["reporting_date"] for p in periods]
    s = [p["academic_semester"] for p in periods]

    records = [
        # Continuous (PPPPP)
        *[_make_rec("N1", "Continuous One", d[i], s[i], 10 * (i + 1)) for i in range(5)],
        # Permanent disappearance unconfirmed (PPAAA)
        _make_rec("N2", "Disappeared Two", d[0], s[0], 50),
        _make_rec("N2", "Disappeared Two", d[1], s[1], 40),
        # Temporary gap & returned (PPAPP)
        *[_make_rec("N3", "Gap Returned Three", d[i], s[i], 15) for i in [0, 1, 3, 4]],
        # Newly observed (AAAPP)
        *[_make_rec("N4", "Newly Four", d[i], s[i], 20) for i in [3, 4]],
        # Intermittent (PAPAP)
        *[_make_rec("N5", "Intermittent Five", d[i], s[i], 30) for i in [0, 2, 4]],
        # Insufficient history (AAPAA - single middle observation)
        _make_rec("N6", "Single Middle Six", d[2], s[2], 8),
        # Uncertain identity
        _make_rec("N7", "Uncertain Seven", d[4], s[4], 99, status="IDENTITY_UNCERTAIN"),
    ]

    cont = analyze_student_continuity(records, periods)
    by_nim = {st["nim"]: st for st in cont["students"]}

    assert by_nim["N1"]["continuity_status"] == "CONTINUOUSLY_OBSERVED"
    assert by_nim["N1"]["clustering_eligible"] is True
    assert by_nim["N1"]["prediction_eligible"] is True
    assert by_nim["N1"]["future_inference_eligible"] is True

    assert by_nim["N2"]["continuity_status"] == "INACTIVE_OR_GRADUATED_UNCONFIRMED"
    assert by_nim["N2"]["clustering_eligible"] is True
    assert by_nim["N2"]["future_inference_eligible"] is False
    # Verify absent periods are None, NEVER 0!
    assert by_nim["N2"]["presence_history"][2]["total_points"] is None
    assert by_nim["N2"]["presence_history"][4]["total_points"] is None
    assert by_nim["N2"]["observed_avg_points"] == 45.0  # (50+40)/2, NOT /5!

    assert by_nim["N3"]["continuity_status"] == "TEMPORARY_GAP_RETURNED"
    assert by_nim["N3"]["return_events"] == 1
    assert by_nim["N3"]["presence_history"][2]["total_points"] is None
    assert by_nim["N3"]["prediction_eligible"] is True

    assert by_nim["N4"]["continuity_status"] == "NEWLY_OBSERVED"
    assert by_nim["N4"]["clustering_eligible"] is True
    assert by_nim["N4"]["prediction_eligible"] is True

    assert by_nim["N5"]["continuity_status"] == "INTERMITTENT_OBSERVATION"
    assert by_nim["N5"]["return_events"] == 2
    assert by_nim["N5"]["prediction_eligible"] is False  # No consecutive P->P transitions

    assert by_nim["N6"]["continuity_status"] == "INSUFFICIENT_HISTORY"
    assert by_nim["N6"]["prediction_eligible"] is False

    assert by_nim["N7"]["continuity_status"] == "IDENTITY_UNCERTAIN"
    assert by_nim["N7"]["clustering_eligible"] is False
    assert by_nim["N7"]["prediction_eligible"] is False
    assert by_nim["N7"]["future_inference_eligible"] is False


# ======================== 4. ANTI-LEAKAGE & FEATURE ENGINEERING TESTS ========================
def test_feature_engineering_no_identity_columns_and_zero_future_leakage():
    forbidden = {"nim", "student_name", "internal_student_id", "student_id", "full_name"}
    assert forbidden.isdisjoint(set(CLUSTERING_FEATURE_COLS))
    assert forbidden.isdisjoint(set(SUPERVISED_FEATURE_COLS))

    periods = [
        {"period_index": 1, "folder_name": "20-11-2025", "reporting_date": "2025-11-20", "academic_semester": "2025-2026_SEM1"},
        {"period_index": 2, "folder_name": "09-03-2026", "reporting_date": "2026-03-09", "academic_semester": "2025-2026_SEM2"},
        {"period_index": 3, "folder_name": "29-04-2026", "reporting_date": "2026-04-29", "academic_semester": "2025-2026_SEM2"},
    ]

    def build_for_p3_value(p3_val: int):
        recs = [
            _make_rec("A1", "Alpha", "2025-11-20", "2025-2026_SEM1", 20),
            _make_rec("A1", "Alpha", "2026-03-09", "2025-2026_SEM2", 12),
            _make_rec("A1", "Alpha", "2026-04-29", "2025-2026_SEM2", p3_val),
            _make_rec("A2", "Beta", "2025-11-20", "2025-2026_SEM1", 0),
            _make_rec("A2", "Beta", "2026-03-09", "2025-2026_SEM2", 0),
            _make_rec("A2", "Beta", "2026-04-29", "2025-2026_SEM2", 4),
        ]
        cont = analyze_student_continuity(recs, periods)
        return build_supervised_transition_dataset(recs, cont)

    df_low, meta_low = build_for_p3_value(18)
    df_high, meta_high = build_for_p3_value(200)

    # For transition P2 -> P3, changing target value at P3 from 18 to 200 MUST NOT change ANY feature!
    idx_low = next(i for i, m in enumerate(meta_low) if m["nim"] == "A1" and m["transition_index"] == 2)
    idx_high = next(i for i, m in enumerate(meta_high) if m["nim"] == "A1" and m["transition_index"] == 2)
    assert meta_low[idx_low]["target_next_points"] == 18.0
    assert meta_high[idx_high]["target_next_points"] == 200.0
    np.testing.assert_allclose(
        df_low.iloc[idx_low].fillna(-999).to_numpy(),
        df_high.iloc[idx_high].fillna(-999).to_numpy(),
    )


# ======================== 5. END-TO-END REAL API & REGISTRY TESTS ========================
def test_ml_endpoints_on_real_trained_artifacts():
    # Status
    r_status = client.get("/ml/status")
    assert r_status.status_code == 200
    st = r_status.json()
    assert st["service_status"] == "UP"
    assert st["dataset_ready"] is True

    # Dataset summary
    r_sum = client.get("/ml/dataset/summary")
    assert r_sum.status_code == 200
    ds = r_sum.json()
    assert ds["folders_scanned"] == 5
    assert ds["files_discovered"] == 35
    assert ds["files_failed"] == 0
    assert ds["total_records"] > 9000

    # Data quality
    r_qual = client.get("/ml/dataset/quality")
    assert r_qual.status_code == 200
    q = r_qual.json()
    assert q["chronological_order_valid"] is True
    assert q["nim_name_conflicts_count"] > 0

    # Continuity pagination & filter
    r_cont = client.get("/ml/students/continuity?status=TEMPORARY_GAP_RETURNED&size=10")
    assert r_cont.status_code == 200
    c_data = r_cont.json()
    assert c_data["summary"]["temporary_gap_returned"] > 0
    assert all(s["continuity_status"] == "TEMPORARY_GAP_RETURNED" for s in c_data["students"])

    # Clustering view
    r_clu = client.get("/ml/clusters")
    assert r_clu.status_code == 200
    clu = r_clu.json()
    assert clu["available"] is True
    assert len(clu["cluster_profiles"]) >= 2

    # Evaluation view (verify chronological validation & no random split)
    r_eval = client.get("/ml/evaluation")
    assert r_eval.status_code == 200
    ev = r_eval.json()
    assert ev["regression"]["details"]["temporal_validation"]["random_split_used"] is False
    assert ev["regression"]["details"]["model_adequate"] is True
    assert ev["classification"]["details"]["model_adequate"] is True

    # Models list & compare
    r_mods = client.get("/ml/models")
    assert r_mods.status_code == 200
    assert r_mods.json()["total"] >= 7

    r_cmp = client.get("/ml/models/compare")
    assert r_cmp.status_code == 200
    assert "REGRESSION" in r_cmp.json()["models_by_type"]

    # Training history
    r_hist = client.get("/ml/training/history")
    assert r_hist.status_code == 200
    assert r_hist.json()["total"] >= 2

    # Predict for an eligible high-point student vs zero-point student (sanity monotonicity check!)
    r_elig = client.get("/ml/students/continuity?eligible_for=inference&size=5")
    high_stu = r_elig.json()["students"][0]
    r_pred = client.post("/ml/predict", json={"nim": high_stu["nim"], "next_is_same_semester": False})
    assert r_pred.status_code == 200
    p_data = r_pred.json()
    assert p_data["eligible"] is True
    assert p_data["regression_estimate"]["predicted_next_points"] > 10.0
    assert p_data["classification_estimate"]["predicted_category"] in {"LOW", "MEDIUM", "HIGH"}
    assert p_data["is_estimate_not_guarantee"] is True

    # Predict refuses IDENTITY_UNCERTAIN
    r_unc = client.get("/ml/students/continuity?status=IDENTITY_UNCERTAIN&size=1")
    unc_stu = r_unc.json()["students"][0]
    r_pred_unc = client.post("/ml/predict", json={"internal_student_id": unc_stu["internal_student_id"]})
    assert r_pred_unc.status_code == 200
    assert r_pred_unc.json()["eligible"] is False

    # Invalid predict request -> 400
    r_bad = client.post("/ml/predict", json={})
    assert r_bad.status_code == 400

    # Batch predict
    r_batch = client.post("/ml/predict/batch", json={"limit": 5})
    assert r_batch.status_code == 200
    assert r_batch.json()["predicted_count"] == 5


def test_model_artifact_joblib_save_load_and_non_silent_override(tmp_path: Path):
    import joblib
    from app.ml.registry import get_selected_model, load_model_bundle

    # Verify active models exist as loadable joblib bundles with full pipelines
    for mtype in ("CLUSTERING", "REGRESSION", "CLASSIFICATION"):
        sel = get_selected_model(mtype)
        assert sel is not None
        bundle = load_model_bundle(sel)
        assert "pipeline" in bundle
        assert "features" in bundle
        if mtype == "CLASSIFICATION":
            assert "thresholds" in bundle

    # Verify synthetic clustering & supervised experiment pipelines run standalone
    rng = np.random.default_rng(42)
    import pandas as pd
    df_clu = pd.DataFrame({col: rng.uniform(0, 100, size=60) for col in CLUSTERING_FEATURE_COLS})
    meta_clu = [
        {
            "internal_student_id": f"S{i}",
            "nim": f"12500{i:03d}",
            "student_name": f"Student {i}",
            "faculty": "FIK",
            "study_program": "Informatika",
            "continuity_status": "CONTINUOUSLY_OBSERVED",
            "total_observed_periods": 5,
            "missing_periods_count": 0,
            "observed_avg_points": 20.0,
            "latest_observed_points": 25,
        }
        for i in range(60)
    ]
    clu_res = run_clustering_experiments(df_clu, meta_clu, k_min=2, k_max=4, include_alternatives=False)
    assert clu_res["status"] == "SUCCESS"
    tmp_file = tmp_path / "test_clu.joblib"
    joblib.dump(clu_res["artifact_bundle"], tmp_file)
    reloaded = joblib.load(tmp_file)
    preds = reloaded["pipeline"].predict(df_clu.iloc[:5])
    assert len(preds) == 5

    # Supervised temporal validation test on synthetic 3-transition dataset
    df_sup = pd.DataFrame({col: rng.uniform(0, 80, size=120) for col in SUPERVISED_FEATURE_COLS})
    meta_sup = []
    for i in range(120):
        t_idx = (i // 40) + 1
        curr = float(df_sup.iloc[i]["current_points"])
        meta_sup.append({
            "transition_index": t_idx,
            "transition_label": f"P{t_idx}->P{t_idx+1}",
            "source_reporting_date": f"2026-0{t_idx}-01",
            "target_reporting_date": f"2026-0{t_idx+1}-01",
            "is_same_semester_transition": True,
            "internal_student_id": f"S{i}",
            "nim": f"1251{i:04d}",
            "continuity_status": "CONTINUOUSLY_OBSERVED",
            "history_subgroup": "PREVIOUSLY_OBSERVED_CONTINUOUS",
            "current_points": curr,
            "target_next_points": max(0.0, curr * 1.4 + float(rng.normal(0, 5))),
        })
    sup_res = run_supervised_experiments(df_sup, meta_sup, task="BOTH")
    assert sup_res["status"] == "SUCCESS"
    assert sup_res["temporal_validation"]["random_split_used"] is False
    assert sup_res["regression"]["model_adequate"] is True
    assert sup_res["classification"]["model_adequate"] is True

