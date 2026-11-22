import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional
import joblib

from app.config import DATASETS_DIR, MODELS_DIR, REGISTRY_FILE, ensure_artifact_dirs


def _default_registry() -> Dict[str, Any]:
    return {
        "latest_dataset_version": None,
        "dataset_versions": [],
        "training_runs": [],
        "models": [],
        "selected_models": {
            "CLUSTERING": None,
            "REGRESSION": None,
            "CLASSIFICATION": None,
        },
    }


def load_registry() -> Dict[str, Any]:
    ensure_artifact_dirs()
    if not REGISTRY_FILE.exists():
        return _default_registry()
    try:
        data = json.loads(REGISTRY_FILE.read_text(encoding="utf-8"))
        for k, v in _default_registry().items():
            data.setdefault(k, v)
        return data
    except Exception:
        return _default_registry()


def save_registry(registry: Dict[str, Any]) -> None:
    ensure_artifact_dirs()
    REGISTRY_FILE.write_text(
        json.dumps(registry, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


def save_dataset_snapshot(
    extraction_result: Dict[str, Any],
    identity_result: Dict[str, Any],
    continuity_result: Dict[str, Any],
    quality_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Persist a versioned historical dataset snapshot on disk and register it in registry.json.
    """
    ensure_artifact_dirs()
    registry = load_registry()
    fingerprint = extraction_result["dataset_fingerprint"]
    existing_versions = registry["dataset_versions"]

    # Check if an identical fingerprint already exists as latest version
    version_num = len(existing_versions) + 1
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    version_id = f"ds_v{version_num}_{fingerprint}"

    dataset_dir = DATASETS_DIR / version_id
    dataset_dir.mkdir(parents=True, exist_ok=True)

    # Save full structured datasets for reproducibility and fast API serving
    (dataset_dir / "resolved_records.json").write_text(
        json.dumps(identity_result["records"], ensure_ascii=False),
        encoding="utf-8",
    )
    (dataset_dir / "continuity.json").write_text(
        json.dumps(continuity_result, ensure_ascii=False),
        encoding="utf-8",
    )
    (dataset_dir / "quality.json").write_text(
        json.dumps(quality_result, ensure_ascii=False),
        encoding="utf-8",
    )
    extraction_meta = {k: v for k, v in extraction_result.items() if k != "records"}
    (dataset_dir / "extraction_report.json").write_text(
        json.dumps(extraction_meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    identity_meta = {k: v for k, v in identity_result.items() if k != "records"}
    (dataset_dir / "identity_report.json").write_text(
        json.dumps(identity_meta, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    entry = {
        "dataset_version": version_id,
        "dataset_fingerprint": fingerprint,
        "created_at": datetime.now().isoformat(),
        "root_dir": extraction_result["root_dir"],
        "folders_scanned": extraction_result["folders_scanned"],
        "files_discovered": extraction_result["files_discovered"],
        "files_succeeded": extraction_result["files_succeeded"],
        "files_failed": extraction_result["files_failed"],
        "total_records": identity_result["summary"]["total_resolved_records"],
        "unique_students": identity_result["summary"]["unique_students_total"],
        "verified_students": identity_result["summary"]["unique_verified_students"],
        "uncertain_identities": identity_result["summary"]["unique_uncertain_entities"],
        "quality_status": quality_result["overall_status"],
        "file_manifest": extraction_result["file_manifest"],
        "change_detection": extraction_result["change_detection"],
        "storage_dir": str(dataset_dir),
    }

    registry["dataset_versions"].append(entry)
    registry["latest_dataset_version"] = version_id
    save_registry(registry)
    return entry


def load_dataset_snapshot(dataset_version: Optional[str] = None) -> Optional[Dict[str, Any]]:
    registry = load_registry()
    target_ver = dataset_version or registry.get("latest_dataset_version")
    if not target_ver:
        return None
    ds_dir = DATASETS_DIR / target_ver
    if not ds_dir.exists():
        return None

    return {
        "dataset_version": target_ver,
        "extraction_report": json.loads((ds_dir / "extraction_report.json").read_text(encoding="utf-8")),
        "identity_report": json.loads((ds_dir / "identity_report.json").read_text(encoding="utf-8")),
        "resolved_records": json.loads((ds_dir / "resolved_records.json").read_text(encoding="utf-8")),
        "continuity": json.loads((ds_dir / "continuity.json").read_text(encoding="utf-8")),
        "quality": json.loads((ds_dir / "quality.json").read_text(encoding="utf-8")),
    }


def register_trained_model(
    model_type: str,
    algorithm: str,
    dataset_version: str,
    run_id: str,
    features: List[str],
    target_definition: str,
    parameters: Dict[str, Any],
    evaluation_metrics: Dict[str, Any],
    artifact_bundle: Dict[str, Any],
    adequate: bool,
    selection_reason: str,
    extra_evaluation: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Save a versioned .joblib model artifact and register its metadata in registry.json.
    IMPORTANT: Does NOT silently replace an already-selected active production model!
    Only marks status as CANDIDATE (or INADEQUATE if below baseline). Activation requires
    explicit selection via `select_active_model()` (or initial bootstrap review).
    """
    ensure_artifact_dirs()
    registry = load_registry()
    mtype = model_type.upper()

    existing_same = [m for m in registry["models"] if m["model_type"] == mtype and m["algorithm"] == algorithm]
    ver_num = len(existing_same) + 1
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    model_id = f"{mtype.lower()}_{algorithm.lower()}_v{ver_num}_{ts}"

    artifact_path = MODELS_DIR / f"{model_id}.joblib"
    joblib.dump(artifact_bundle, artifact_path)

    eval_detail_path = MODELS_DIR / f"{model_id}_evaluation.json"
    eval_detail_path.write_text(
        json.dumps(
            {
                "model_id": model_id,
                "model_type": mtype,
                "algorithm": algorithm,
                "dataset_version": dataset_version,
                "evaluation_metrics": evaluation_metrics,
                "extra_evaluation": extra_evaluation or {},
                "selection_reason": selection_reason,
            },
            indent=2,
            ensure_ascii=False,
        ),
        encoding="utf-8",
    )

    model_record = {
        "model_id": model_id,
        "model_name": f"{algorithm} ({mtype})",
        "model_type": mtype,
        "algorithm": algorithm,
        "version": f"v{ver_num}",
        "run_id": run_id,
        "dataset_version": dataset_version,
        "trained_at": datetime.now().isoformat(),
        "parameters": parameters,
        "features": features,
        "target_definition": target_definition,
        "evaluation_metrics": evaluation_metrics,
        "adequate": adequate,
        "status": "CANDIDATE" if adequate else "NEEDS_REVIEW",
        "is_selected": False,
        "selection_reason": selection_reason,
        "artifact_path": str(artifact_path),
        "evaluation_path": str(eval_detail_path),
    }

    registry["models"].append(model_record)
    save_registry(registry)
    return model_record


def record_training_run(
    run_id: str,
    task_type: str,
    dataset_version: Optional[str],
    parameters: Dict[str, Any],
    status: str,
    model_ids: List[str],
    metrics_summary: Dict[str, Any],
    error: Optional[str] = None,
    started_at: Optional[str] = None,
) -> Dict[str, Any]:
    registry = load_registry()
    entry = {
        "run_id": run_id,
        "task_type": task_type.upper(),
        "dataset_version": dataset_version,
        "parameters": parameters,
        "status": status,
        "model_ids": model_ids,
        "metrics_summary": metrics_summary,
        "error": error,
        "started_at": started_at or datetime.now().isoformat(),
        "completed_at": datetime.now().isoformat(),
    }
    registry["training_runs"].append(entry)
    save_registry(registry)
    return entry


def select_active_model(model_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
    """
    Explicitly activate a reviewed model artifact for its model_type (CLUSTERING, REGRESSION, or CLASSIFICATION).
    """
    registry = load_registry()
    target = next((m for m in registry["models"] if m["model_id"] == model_id), None)
    if target is None:
        raise ValueError(f"Model ID tidak ditemukan: {model_id}")

    artifact_path = Path(target["artifact_path"])
    if not artifact_path.exists():
        raise ValueError(f"File artifact model tidak ditemukan di disk: {artifact_path}")

    mtype = target["model_type"]
    for m in registry["models"]:
        if m["model_type"] == mtype:
            m["is_selected"] = m["model_id"] == model_id
            if m["is_selected"]:
                m["status"] = "ACTIVE"
                m["selected_at"] = datetime.now().isoformat()
                if notes:
                    m["selection_notes"] = notes
            elif m["status"] == "ACTIVE":
                m["status"] = "ARCHIVED"

    registry["selected_models"][mtype] = model_id
    save_registry(registry)
    return target


def get_selected_model(model_type: str) -> Optional[Dict[str, Any]]:
    registry = load_registry()
    mid = registry.get("selected_models", {}).get(model_type.upper())
    if not mid:
        return None
    return next((m for m in registry["models"] if m["model_id"] == mid), None)


def load_model_bundle(model_record: Dict[str, Any]) -> Dict[str, Any]:
    path = Path(model_record["artifact_path"])
    if not path.exists():
        raise FileNotFoundError(f"Artifact model tidak tersedia: {path}")
    return joblib.load(path)


def load_model_evaluation(model_record: Dict[str, Any]) -> Dict[str, Any]:
    path = Path(model_record["evaluation_path"])
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))
