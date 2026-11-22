import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd

from app.config import DEFAULT_HISTORICAL_DIR, RANDOM_STATE
from app.ml.clustering import CLUSTERING_ETHICS_DISCLAIMER, run_clustering_experiments
from app.ml.continuity import analyze_student_continuity
from app.ml.extractor import scan_and_extract_directory
from app.ml.features import (
    CLUSTERING_FEATURE_COLS,
    SUPERVISED_FEATURE_COLS,
    build_clustering_dataset,
    build_inference_feature_row,
    build_supervised_transition_dataset,
)
from app.ml.identity import resolve_student_identities
from app.ml.quality import run_data_quality_audit
from app.ml.registry import (
    get_selected_model,
    load_dataset_snapshot,
    load_model_bundle,
    load_model_evaluation,
    load_registry,
    record_training_run,
    register_trained_model,
    save_dataset_snapshot,
    select_active_model,
)
from app.ml.supervised import (
    CLASS_ORDER,
    PREDICTION_ETHICS_DISCLAIMER,
    run_supervised_experiments,
)

logger = logging.getLogger("studentinsight.ml")


def _new_run_id(prefix: str) -> str:
    return f"run_{prefix}_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:19]}"


def process_historical_data(
    data_dir: Optional[str] = None,
    use_cache: bool = True,
) -> Dict[str, Any]:
    """
    Execute the complete data processing pipeline:
    Scan directory -> Extract PDF/XLSX -> Normalize -> Identity Resolution ->
    Period Alignment -> Continuity Analysis -> Data Quality Audit -> Versioned Snapshot.
    Never modifies or deletes original PDF/XLSX files.
    """
    root_path = Path(data_dir) if data_dir else DEFAULT_HISTORICAL_DIR
    registry = load_registry()

    previous_manifest: Dict[str, str] = {}
    if registry.get("dataset_versions"):
        previous_manifest = registry["dataset_versions"][-1].get("file_manifest", {})

    extraction = scan_and_extract_directory(
        root_dir=root_path,
        use_cache=use_cache,
        previous_manifest=previous_manifest,
    )
    if extraction["status"] in {"FAILED", "EMPTY"}:
        return {
            "status": extraction["status"],
            "error": extraction.get("error", "Tidak ada data yang berhasil diproses."),
            "extraction": extraction,
        }

    identity = resolve_student_identities(extraction["records"])
    continuity = analyze_student_continuity(identity["records"], extraction["periods"])
    quality = run_data_quality_audit(extraction, identity, continuity)

    snapshot_entry = save_dataset_snapshot(extraction, identity, continuity, quality)
    logger.info(
        "Processed historical dataset %s: %d files, %d records, %d unique students, quality=%s",
        snapshot_entry["dataset_version"],
        snapshot_entry["files_discovered"],
        snapshot_entry["total_records"],
        snapshot_entry["unique_students"],
        snapshot_entry["quality_status"],
    )

    return {
        "status": "SUCCESS",
        "dataset_version": snapshot_entry["dataset_version"],
        "dataset_fingerprint": snapshot_entry["dataset_fingerprint"],
        "created_at": snapshot_entry["created_at"],
        "change_detection": snapshot_entry["change_detection"],
        "extraction_summary": {
            "folders_scanned": extraction["folders_scanned"],
            "files_discovered": extraction["files_discovered"],
            "files_succeeded": extraction["files_succeeded"],
            "files_failed": extraction["files_failed"],
            "pdf_files_count": extraction["pdf_files_count"],
            "xlsx_files_count": extraction["xlsx_files_count"],
            "total_records_extracted": extraction["total_records_extracted"],
            "periods": extraction["periods"],
        },
        "identity_summary": identity["summary"],
        "continuity_summary": continuity["summary"],
        "quality_status": quality["overall_status"],
        "quality_issues": quality["issues"],
    }


def _require_snapshot(dataset_version: Optional[str] = None) -> Dict[str, Any]:
    snap = load_dataset_snapshot(dataset_version)
    if snap is None:
        raise ValueError(
            "Dataset historis belum diproses. Jalankan pemrosesan dataset (/ml/process-data) terlebih dahulu."
        )
    return snap


def train_clustering_pipeline(
    dataset_version: Optional[str] = None,
    k_min: int = 2,
    k_max: int = 8,
    preferred_k: Optional[int] = None,
    include_alternatives: bool = True,
    random_state: int = RANDOM_STATE,
    auto_select_if_none: bool = False,
) -> Dict[str, Any]:
    started_at = datetime.now().isoformat()
    run_id = _new_run_id("cluster")
    params = {
        "k_min": k_min,
        "k_max": k_max,
        "preferred_k": preferred_k,
        "include_alternatives": include_alternatives,
        "random_state": random_state,
    }
    try:
        snap = _require_snapshot(dataset_version)
        ds_ver = snap["dataset_version"]
        df_feat, meta_rows = build_clustering_dataset(snap["resolved_records"], snap["continuity"])
        result = run_clustering_experiments(
            df_features=df_feat,
            meta_rows=meta_rows,
            k_min=k_min,
            k_max=k_max,
            include_alternatives=include_alternatives,
            preferred_k=preferred_k,
            random_state=random_state,
        )
        if result["status"] != "SUCCESS":
            record_training_run(
                run_id=run_id,
                task_type="CLUSTERING",
                dataset_version=ds_ver,
                parameters=params,
                status="FAILED",
                model_ids=[],
                metrics_summary={},
                error=result.get("message", "Clustering gagal."),
                started_at=started_at,
            )
            return result

        model_rec = register_trained_model(
            model_type="CLUSTERING",
            algorithm=f"KMeans_K{result['recommended_k']}",
            dataset_version=ds_ver,
            run_id=run_id,
            features=result["features"],
            target_definition="Unsupervised student historical point accumulation profiles",
            parameters={**params, "selected_k": result["recommended_k"]},
            evaluation_metrics=result["metrics"],
            artifact_bundle=result["artifact_bundle"],
            adequate=result["quality_verdict"] == "MEANINGFUL_CLUSTERING",
            selection_reason=result["selection_reason"],
            extra_evaluation={
                "quality_verdict": result["quality_verdict"],
                "recommended_k": result["recommended_k"],
                "k_evaluation_curve": result["k_evaluation_curve"],
                "algorithm_comparison": result["algorithm_comparison"],
                "cluster_profiles": result["cluster_profiles"],
                "pca_explained_variance_pct": result["pca_explained_variance_pct"],
                "ethics_disclaimer": result["ethics_disclaimer"],
                "limitations": result["limitations"],
                "student_assignments": result["student_assignments"],
            },
        )

        # Never silently overwrite an existing active model; only auto-select if explicitly requested AND none active yet
        if auto_select_if_none and get_selected_model("CLUSTERING") is None:
            model_rec = select_active_model(model_rec["model_id"], notes="Initial clustering baseline selected after evaluation.")

        record_training_run(
            run_id=run_id,
            task_type="CLUSTERING",
            dataset_version=ds_ver,
            parameters={**params, "selected_k": result["recommended_k"]},
            status="COMPLETED",
            model_ids=[model_rec["model_id"]],
            metrics_summary=result["metrics"],
            started_at=started_at,
        )

        return {
            "status": "SUCCESS",
            "run_id": run_id,
            "dataset_version": ds_ver,
            "model": model_rec,
            "quality_verdict": result["quality_verdict"],
            "recommended_k": result["recommended_k"],
            "selection_reason": result["selection_reason"],
            "ethics_disclaimer": result["ethics_disclaimer"],
            "metrics": result["metrics"],
            "k_evaluation_curve": result["k_evaluation_curve"],
            "algorithm_comparison": result["algorithm_comparison"],
            "cluster_profiles": result["cluster_profiles"],
            "pca_explained_variance_pct": result["pca_explained_variance_pct"],
            "limitations": result["limitations"],
        }
    except Exception as exc:
        logger.exception("Clustering training failed")
        record_training_run(
            run_id=run_id,
            task_type="CLUSTERING",
            dataset_version=dataset_version,
            parameters=params,
            status="FAILED",
            model_ids=[],
            metrics_summary={},
            error=str(exc),
            started_at=started_at,
        )
        raise


def train_supervised_pipeline(
    dataset_version: Optional[str] = None,
    task: str = "BOTH",
    algorithms: Optional[List[str]] = None,
    custom_thresholds: Optional[Dict[str, float]] = None,
    hyperparameters: Optional[Dict[str, Any]] = None,
    random_state: int = RANDOM_STATE,
    auto_select_if_none: bool = False,
) -> Dict[str, Any]:
    started_at = datetime.now().isoformat()
    run_id = _new_run_id("pred")
    params = {
        "task": task,
        "algorithms": algorithms,
        "custom_thresholds": custom_thresholds,
        "hyperparameters": hyperparameters or {},
        "random_state": random_state,
    }
    try:
        snap = _require_snapshot(dataset_version)
        ds_ver = snap["dataset_version"]
        df_feat, meta_rows = build_supervised_transition_dataset(snap["resolved_records"], snap["continuity"])

        res = run_supervised_experiments(
            df_features=df_feat,
            meta_rows=meta_rows,
            task=task,
            algorithms=algorithms,
            custom_thresholds=custom_thresholds,
            hyperparameters=hyperparameters,
            random_state=random_state,
        )
        if res["status"] != "SUCCESS":
            record_training_run(
                run_id=run_id,
                task_type=f"SUPERVISED_{task.upper()}",
                dataset_version=ds_ver,
                parameters=params,
                status="FAILED",
                model_ids=[],
                metrics_summary={},
                error=res.get("message", "Pelatihan supervised gagal."),
                started_at=started_at,
            )
            return res

        registered_models: List[Dict[str, Any]] = []
        metrics_summary: Dict[str, Any] = {}

        if "regression" in res:
            reg = res["regression"]
            best_algo = reg["recommended_algorithm"]
            for algo_name, cand in reg["candidates"].items():
                m_rec = register_trained_model(
                    model_type="REGRESSION",
                    algorithm=algo_name,
                    dataset_version=ds_ver,
                    run_id=run_id,
                    features=res["features"],
                    target_definition=reg["target_definition"],
                    parameters=params,
                    evaluation_metrics={
                        "mae": cand["test_metrics"]["mae"],
                        "rmse": cand["test_metrics"]["rmse"],
                        "r2": cand["test_metrics"]["r2"],
                        "median_abs_error": cand["test_metrics"]["median_abs_error"],
                        "cv_mean_mae": cand["cv_mean_mae"],
                        "cv_mean_rmse": cand["cv_mean_rmse"],
                        "cv_mean_r2": cand["cv_mean_r2"],
                    },
                    artifact_bundle=reg["artifact_bundles"][algo_name],
                    adequate=reg["model_adequate"],
                    selection_reason=reg["selection_reason"] if algo_name == best_algo else f"Model kandidat pembanding ({algo_name}).",
                    extra_evaluation={
                        "temporal_validation": res["temporal_validation"],
                        "baselines": reg["baselines"],
                        "test_metrics": cand["test_metrics"],
                        "expanding_window_cv": cand["expanding_window_cv"],
                        "subgroup_metrics": cand["subgroup_metrics"],
                        "feature_importance": cand["feature_importance"],
                        "actual_vs_predicted_sample": cand["actual_vs_predicted_sample"],
                        "comparison_table": reg["comparison_table"],
                        "model_adequate": reg["model_adequate"],
                        "limitations": reg["limitations"],
                        "ethics_disclaimer": res["ethics_disclaimer"],
                    },
                )
                if auto_select_if_none and algo_name == best_algo and reg["model_adequate"] and get_selected_model("REGRESSION") is None:
                    m_rec = select_active_model(m_rec["model_id"], notes="Initial best regression model selected after temporal validation.")
                registered_models.append(m_rec)
            metrics_summary["regression_best"] = {
                "algorithm": best_algo,
                **reg["candidates"][best_algo]["test_metrics"],
                "adequate": reg["model_adequate"],
            }
            # Remove non-JSON-serializable pipelines before returning HTTP response
            reg.pop("artifact_bundles", None)

        if "classification" in res and "candidates" in res["classification"]:
            cls = res["classification"]
            best_algo = cls["recommended_algorithm"]
            for algo_name, cand in cls["candidates"].items():
                m_rec = register_trained_model(
                    model_type="CLASSIFICATION",
                    algorithm=algo_name,
                    dataset_version=ds_ver,
                    run_id=run_id,
                    features=res["features"],
                    target_definition=cls["target_definition"],
                    parameters={**params, "thresholds": cls["thresholds"]},
                    evaluation_metrics={
                        "accuracy": cand["test_metrics"]["accuracy"],
                        "precision_macro": cand["test_metrics"]["precision_macro"],
                        "recall_macro": cand["test_metrics"]["recall_macro"],
                        "macro_f1": cand["test_metrics"]["macro_f1"],
                        "weighted_f1": cand["test_metrics"]["weighted_f1"],
                        "balanced_accuracy": cand["test_metrics"]["balanced_accuracy"],
                        "high_class_recall": cand["test_metrics"]["high_class_recall"],
                        "cv_mean_macro_f1": cand["cv_mean_macro_f1"],
                    },
                    artifact_bundle=cls["artifact_bundles"][algo_name],
                    adequate=cls["model_adequate"],
                    selection_reason=cls["selection_reason"] if algo_name == best_algo else f"Model kandidat pembanding ({algo_name}).",
                    extra_evaluation={
                        "temporal_validation": res["temporal_validation"],
                        "thresholds": cls["thresholds"],
                        "train_class_distribution": cls["train_class_distribution"],
                        "test_class_distribution": cls["test_class_distribution"],
                        "baselines": cls["baselines"],
                        "test_metrics": cand["test_metrics"],
                        "expanding_window_cv": cand["expanding_window_cv"],
                        "subgroup_metrics": cand["subgroup_metrics"],
                        "feature_importance": cand["feature_importance"],
                        "comparison_table": cls["comparison_table"],
                        "model_adequate": cls["model_adequate"],
                        "limitations": cls["limitations"],
                        "ethics_disclaimer": res["ethics_disclaimer"],
                    },
                )
                if auto_select_if_none and algo_name == best_algo and cls["model_adequate"] and get_selected_model("CLASSIFICATION") is None:
                    m_rec = select_active_model(m_rec["model_id"], notes="Initial best classification model selected after temporal validation.")
                registered_models.append(m_rec)
            metrics_summary["classification_best"] = {
                "algorithm": best_algo,
                "macro_f1": cls["candidates"][best_algo]["test_metrics"]["macro_f1"],
                "balanced_accuracy": cls["candidates"][best_algo]["test_metrics"]["balanced_accuracy"],
                "high_class_recall": cls["candidates"][best_algo]["test_metrics"]["high_class_recall"],
                "accuracy": cls["candidates"][best_algo]["test_metrics"]["accuracy"],
                "adequate": cls["model_adequate"],
            }
            cls.pop("artifact_bundles", None)

        record_training_run(
            run_id=run_id,
            task_type=f"SUPERVISED_{task.upper()}",
            dataset_version=ds_ver,
            parameters=params,
            status="COMPLETED",
            model_ids=[m["model_id"] for m in registered_models],
            metrics_summary=metrics_summary,
            started_at=started_at,
        )

        return {
            "status": "SUCCESS",
            "run_id": run_id,
            "dataset_version": ds_ver,
            "registered_models": registered_models,
            **res,
        }
    except Exception as exc:
        logger.exception("Supervised training failed")
        record_training_run(
            run_id=run_id,
            task_type=f"SUPERVISED_{task.upper()}",
            dataset_version=dataset_version,
            parameters=params,
            status="FAILED",
            model_ids=[],
            metrics_summary={},
            error=str(exc),
            started_at=started_at,
        )
        raise


def train_all_pipelines(
    data_dir: Optional[str] = None,
    reprocess_data: bool = False,
    auto_select_if_none: bool = False,
) -> Dict[str, Any]:
    snap = load_dataset_snapshot()
    proc_res = None
    if snap is None or reprocess_data:
        proc_res = process_historical_data(data_dir=data_dir, use_cache=True)
        if proc_res["status"] != "SUCCESS":
            return {"status": "FAILED", "stage": "data_processing", "details": proc_res}

    clustering_res = train_clustering_pipeline(auto_select_if_none=auto_select_if_none)
    supervised_res = train_supervised_pipeline(task="BOTH", auto_select_if_none=auto_select_if_none)
    return {
        "status": "SUCCESS",
        "dataset_processing": proc_res,
        "clustering": clustering_res,
        "supervised": supervised_res,
    }


def get_ml_status() -> Dict[str, Any]:
    registry = load_registry()
    latest_ver = registry.get("latest_dataset_version")
    latest_ds = next(
        (d for d in registry.get("dataset_versions", []) if d["dataset_version"] == latest_ver),
        None,
    )
    selected = {
        mtype: get_selected_model(mtype)
        for mtype in ("CLUSTERING", "REGRESSION", "CLASSIFICATION")
    }
    latest_run = registry["training_runs"][-1] if registry.get("training_runs") else None

    return {
        "service_status": "UP",
        "historical_data_dir": str(DEFAULT_HISTORICAL_DIR),
        "dataset_ready": latest_ds is not None,
        "latest_dataset_version": latest_ver,
        "latest_dataset": latest_ds,
        "total_dataset_versions": len(registry.get("dataset_versions", [])),
        "total_trained_models": len(registry.get("models", [])),
        "total_training_runs": len(registry.get("training_runs", [])),
        "latest_training_run": latest_run,
        "selected_models": selected,
    }


def get_dataset_summary(dataset_version: Optional[str] = None) -> Dict[str, Any]:
    snap = _require_snapshot(dataset_version)
    ext = snap["extraction_report"]
    ident = snap["identity_report"]
    cont = snap["continuity"]
    qual = snap["quality"]

    # Build period point trend summary for charts
    period_trends = []
    dist_by_date = {d["reporting_date"]: d for d in qual.get("period_distributions", [])}
    for p in ext.get("periods", []):
        d = dist_by_date.get(p["reporting_date"], {})
        period_trends.append(
            {
                "period_index": p["period_index"],
                "folder_name": p["folder_name"],
                "reporting_date": p["reporting_date"],
                "academic_semester": p["academic_semester"],
                "period_label": p["period_label"],
                "files_count": p["files_count"],
                "records_extracted": p["records_extracted"],
                "mean_points": d.get("mean", 0.0),
                "median_points": d.get("median", 0.0),
                "p95_points": d.get("p95", 0.0),
                "max_points": d.get("max", 0),
                "zero_point_pct": d.get("zero_point_pct", 0.0),
            }
        )

    return {
        "dataset_version": snap["dataset_version"],
        "dataset_fingerprint": ext.get("dataset_fingerprint"),
        "processed_at": ext.get("processed_at"),
        "root_dir": ext.get("root_dir"),
        "folders_scanned": ext.get("folders_scanned", 0),
        "files_discovered": ext.get("files_discovered", 0),
        "files_succeeded": ext.get("files_succeeded", 0),
        "files_failed": ext.get("files_failed", 0),
        "pdf_files_count": ext.get("pdf_files_count", 0),
        "xlsx_files_count": ext.get("xlsx_files_count", 0),
        "total_records": ident["summary"]["total_resolved_records"],
        "identity_summary": ident["summary"],
        "continuity_summary": cont["summary"],
        "quality_status": qual["overall_status"],
        "change_detection": ext.get("change_detection", {}),
        "periods": period_trends,
        "file_reports": ext.get("file_reports", []),
    }


def get_dataset_quality(dataset_version: Optional[str] = None) -> Dict[str, Any]:
    snap = _require_snapshot(dataset_version)
    return {
        "dataset_version": snap["dataset_version"],
        **snap["quality"],
    }


def get_students_continuity(
    dataset_version: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    faculty: Optional[str] = None,
    eligible_for: Optional[str] = None,
    page: int = 0,
    size: int = 50,
) -> Dict[str, Any]:
    snap = _require_snapshot(dataset_version)
    cont = snap["continuity"]
    students = cont["students"]

    filtered = students
    if status:
        s_up = status.upper()
        filtered = [s for s in filtered if s["continuity_status"] == s_up]
    if faculty:
        f_low = faculty.lower()
        filtered = [s for s in filtered if (s.get("faculty") or "").lower() == f_low]
    if eligible_for:
        ef = eligible_for.lower()
        if ef == "clustering":
            filtered = [s for s in filtered if s["clustering_eligible"]]
        elif ef == "prediction":
            filtered = [s for s in filtered if s["prediction_eligible"]]
        elif ef == "inference":
            filtered = [s for s in filtered if s["future_inference_eligible"]]
    if search:
        q = search.strip().lower()
        filtered = [
            s
            for s in filtered
            if q in (s.get("nim") or "").lower()
            or q in (s.get("student_name") or "").lower()
            or q in (s.get("internal_student_id") or "").lower()
            or q in (s.get("study_program") or "").lower()
        ]

    # Sort by latest observed points descending (None at bottom)
    filtered.sort(
        key=lambda s: (
            s.get("latest_observed_points") if s.get("latest_observed_points") is not None else -1,
            s.get("observed_avg_points") or -1,
        ),
        reverse=True,
    )

    total = len(filtered)
    start = max(0, page) * max(1, size)
    end = start + max(1, size)

    return {
        "dataset_version": snap["dataset_version"],
        "periods": cont["periods"],
        "summary": cont["summary"],
        "page": page,
        "size": size,
        "total_elements": total,
        "total_pages": (total + max(1, size) - 1) // max(1, size),
        "students": filtered[start:end],
    }


def get_clusters_view(model_id: Optional[str] = None, sample_limit: int = 400) -> Dict[str, Any]:
    registry = load_registry()
    if model_id:
        model_rec = next((m for m in registry["models"] if m["model_id"] == model_id), None)
    else:
        model_rec = get_selected_model("CLUSTERING")
        if model_rec is None:
            # Fallback to latest trained clustering candidate for preview
            cands = [m for m in registry["models"] if m["model_type"] == "CLUSTERING"]
            model_rec = cands[-1] if cands else None

    if model_rec is None:
        return {"available": False, "message": "Belum ada model clustering yang dilatih."}

    ev = load_model_evaluation(model_rec)
    extra = ev.get("extra_evaluation", {})
    assignments = extra.get("student_assignments", [])
    # Deterministic stratified scatter sample so browser stays silky-smooth
    step = max(1, len(assignments) // max(50, sample_limit))
    scatter_sample = assignments[::step]

    return {
        "available": True,
        "model": model_rec,
        "quality_verdict": extra.get("quality_verdict"),
        "recommended_k": extra.get("recommended_k"),
        "ethics_disclaimer": extra.get("ethics_disclaimer", CLUSTERING_ETHICS_DISCLAIMER),
        "metrics": model_rec["evaluation_metrics"],
        "k_evaluation_curve": extra.get("k_evaluation_curve", []),
        "algorithm_comparison": extra.get("algorithm_comparison", []),
        "cluster_profiles": extra.get("cluster_profiles", []),
        "pca_explained_variance_pct": extra.get("pca_explained_variance_pct", []),
        "limitations": extra.get("limitations", []),
        "scatter_sample": scatter_sample,
        "total_assigned_students": len(assignments),
    }


def get_evaluation_overview() -> Dict[str, Any]:
    registry = load_registry()
    out: Dict[str, Any] = {
        "dataset_version": registry.get("latest_dataset_version"),
        "selected_models": registry.get("selected_models", {}),
    }

    for mtype in ("CLUSTERING", "REGRESSION", "CLASSIFICATION"):
        sel = get_selected_model(mtype)
        all_of_type = [m for m in registry.get("models", []) if m["model_type"] == mtype]
        ref_model = sel or (all_of_type[-1] if all_of_type else None)
        if ref_model:
            ev = load_model_evaluation(ref_model)
            extra = dict(ev.get("extra_evaluation", {}))
            # Avoid shipping thousands of raw cluster assignments inside general evaluation overview
            extra.pop("student_assignments", None)
            out[mtype.lower()] = {
                "selected": sel is not None,
                "model": ref_model,
                "details": extra,
            }
        else:
            out[mtype.lower()] = None

    return out


def compare_models(model_type: Optional[str] = None) -> Dict[str, Any]:
    registry = load_registry()
    models = registry.get("models", [])
    if model_type:
        models = [m for m in models if m["model_type"] == model_type.upper()]

    grouped: Dict[str, List[Dict[str, Any]]] = {"CLUSTERING": [], "REGRESSION": [], "CLASSIFICATION": []}
    for m in models:
        grouped.setdefault(m["model_type"], []).append(
            {
                "model_id": m["model_id"],
                "model_name": m["model_name"],
                "algorithm": m["algorithm"],
                "version": m["version"],
                "dataset_version": m["dataset_version"],
                "trained_at": m["trained_at"],
                "status": m["status"],
                "is_selected": m["is_selected"],
                "adequate": m["adequate"],
                "evaluation_metrics": m["evaluation_metrics"],
                "selection_reason": m.get("selection_reason"),
            }
        )
    return {
        "selected_models": registry.get("selected_models", {}),
        "models_by_type": grouped,
    }


def predict_for_student(
    nim: Optional[str] = None,
    internal_student_id: Optional[str] = None,
    next_is_same_semester: bool = False,
    expected_days_to_next: int = 120,
    allow_inactive_preview: bool = False,
) -> Dict[str, Any]:
    """
    Generate an honest future-period point estimate (regression + classification + cluster profile)
    for a student using the currently SELECTED (active) models.
    """
    if not nim and not internal_student_id:
        raise ValueError("Harap sertakan `nim` atau `internal_student_id`.")

    snap = _require_snapshot()
    cont = snap["continuity"]

    stu = None
    if internal_student_id:
        stu = next((s for s in cont["students"] if s["internal_student_id"] == internal_student_id), None)
    if stu is None and nim:
        target_nim = nim.strip().upper()
        stu = next(
            (
                s
                for s in cont["students"]
                if (s.get("nim") or "").upper() == target_nim and s["continuity_status"] != "IDENTITY_UNCERTAIN"
            ),
            None,
        )
        if stu is None:
            stu = next((s for s in cont["students"] if (s.get("nim") or "").upper() == target_nim), None)

    if stu is None:
        raise ValueError(f"Mahasiswa tidak ditemukan pada dataset historis (nim={nim}, id={internal_student_id}).")

    if stu["continuity_status"] == "IDENTITY_UNCERTAIN":
        return {
            "eligible": False,
            "student": stu,
            "reason": (
                "Mahasiswa berstatus IDENTITY_UNCERTAIN (konflik NIM-Nama atau NIM belum terverifikasi). "
                "Prediksi tidak diizinkan sampai identitas diverifikasi secara manual."
            ),
            "ethics_disclaimer": PREDICTION_ETHICS_DISCLAIMER,
        }

    if not stu["future_inference_eligible"] and not allow_inactive_preview:
        return {
            "eligible": False,
            "student": stu,
            "reason": stu.get("exclusion_reason")
            or "Mahasiswa tidak terobservasi pada periode laporan terbaru (INACTIVE_OR_GRADUATED_UNCONFIRMED).",
            "ethics_disclaimer": PREDICTION_ETHICS_DISCLAIMER,
        }

    reg_model_rec = get_selected_model("REGRESSION")
    cls_model_rec = get_selected_model("CLASSIFICATION")
    clu_model_rec = get_selected_model("CLUSTERING")

    if reg_model_rec is None and cls_model_rec is None:
        raise ValueError(
            "Belum ada model prediksi aktif yang dipilih. Latih dan aktifkan model melalui Model Management terlebih dahulu."
        )

    feat_dict = build_inference_feature_row(
        stu=stu,
        resolved_records=snap["resolved_records"],
        periods_meta=cont["periods"],
        next_is_same_semester=next_is_same_semester,
        expected_days_to_next=expected_days_to_next,
    )
    X_row = pd.DataFrame([feat_dict], columns=SUPERVISED_FEATURE_COLS)

    regression_pred = None
    if reg_model_rec is not None:
        reg_bundle = load_model_bundle(reg_model_rec)
        raw_val = float(reg_bundle["pipeline"].predict(X_row)[0])
        est_points = round(max(0.0, raw_val), 1)
        regression_pred = {
            "model_id": reg_model_rec["model_id"],
            "algorithm": reg_model_rec["algorithm"],
            "model_version": reg_model_rec["version"],
            "predicted_next_points": est_points,
            "test_mae_reference": reg_model_rec["evaluation_metrics"].get("mae"),
            "test_rmse_reference": reg_model_rec["evaluation_metrics"].get("rmse"),
            "estimate_range_hint": {
                "low": round(max(0.0, est_points - float(reg_model_rec["evaluation_metrics"].get("mae", 10.0))), 1),
                "high": round(est_points + float(reg_model_rec["evaluation_metrics"].get("mae", 10.0)), 1),
            },
        }

    classification_pred = None
    if cls_model_rec is not None:
        cls_bundle = load_model_bundle(cls_model_rec)
        pipe = cls_bundle["pipeline"]
        pred_cls = str(pipe.predict(X_row)[0])
        probs_map: Dict[str, float] = {}
        if hasattr(pipe, "predict_proba"):
            proba = pipe.predict_proba(X_row)[0]
            classes = list(pipe.classes_)
            for c_name, p_val in zip(classes, proba):
                probs_map[str(c_name)] = round(float(p_val), 4)
        confidence = max(probs_map.values()) if probs_map else None
        classification_pred = {
            "model_id": cls_model_rec["model_id"],
            "algorithm": cls_model_rec["algorithm"],
            "model_version": cls_model_rec["version"],
            "predicted_category": pred_cls,
            "probabilities": probs_map,
            "confidence": confidence,
            "thresholds_used": cls_bundle.get("thresholds"),
        }

    cluster_profile = None
    if clu_model_rec is not None:
        clu_ev = load_model_evaluation(clu_model_rec)
        assignments = clu_ev.get("extra_evaluation", {}).get("student_assignments", [])
        match = next((a for a in assignments if a["internal_student_id"] == stu["internal_student_id"]), None)
        if match:
            cluster_profile = {
                "model_id": clu_model_rec["model_id"],
                "cluster_id": match["cluster_id"],
                "cluster_label": match["cluster_label"],
                "disclaimer": CLUSTERING_ETHICS_DISCLAIMER,
            }

    # Replace NaN with None for clean JSON serialization
    clean_features = {k: (None if isinstance(v, float) and np.isnan(v) else round(float(v), 3)) for k, v in feat_dict.items()}

    return {
        "eligible": True,
        "dataset_version": snap["dataset_version"],
        "student": {
            "internal_student_id": stu["internal_student_id"],
            "nim": stu["nim"],
            "student_name": stu["student_name"],
            "faculty": stu["faculty"],
            "study_program": stu["study_program"],
            "continuity_status": stu["continuity_status"],
            "presence_pattern": stu["presence_pattern"],
            "total_observed_periods": stu["total_observed_periods"],
            "missing_periods_count": stu["missing_periods_count"],
            "observed_avg_points": stu["observed_avg_points"],
            "latest_observed_points": stu["latest_observed_points"],
            "presence_history": stu["presence_history"],
        },
        "prediction_context": {
            "next_is_same_semester": next_is_same_semester,
            "expected_days_to_next": expected_days_to_next,
        },
        "regression_estimate": regression_pred,
        "classification_estimate": classification_pred,
        "cluster_profile": cluster_profile,
        "features_used": clean_features,
        "is_estimate_not_guarantee": True,
        "ethics_disclaimer": PREDICTION_ETHICS_DISCLAIMER,
    }


def predict_batch_students(
    nims: Optional[List[str]] = None,
    next_is_same_semester: bool = False,
    expected_days_to_next: int = 120,
    limit: int = 200,
) -> Dict[str, Any]:
    snap = _require_snapshot()
    cont = snap["continuity"]
    reg_model_rec = get_selected_model("REGRESSION")
    cls_model_rec = get_selected_model("CLASSIFICATION")
    if reg_model_rec is None and cls_model_rec is None:
        raise ValueError("Belum ada model prediksi aktif yang dipilih.")

    if nims:
        wanted = {n.strip().upper() for n in nims if n and n.strip()}
        targets = [s for s in cont["students"] if (s.get("nim") or "").upper() in wanted]
    else:
        targets = [s for s in cont["students"] if s["future_inference_eligible"]][: max(1, min(limit, 500))]

    results = []
    skipped = 0
    for stu in targets:
        try:
            res = predict_for_student(
                internal_student_id=stu["internal_student_id"],
                next_is_same_semester=next_is_same_semester,
                expected_days_to_next=expected_days_to_next,
            )
            if not res.get("eligible"):
                skipped += 1
            results.append(res)
        except Exception as exc:
            skipped += 1
            results.append(
                {
                    "eligible": False,
                    "internal_student_id": stu["internal_student_id"],
                    "nim": stu.get("nim"),
                    "error": str(exc),
                }
            )

    return {
        "dataset_version": snap["dataset_version"],
        "total_requested": len(targets),
        "predicted_count": len(results) - skipped,
        "skipped_count": skipped,
        "ethics_disclaimer": PREDICTION_ETHICS_DISCLAIMER,
        "results": results,
    }
