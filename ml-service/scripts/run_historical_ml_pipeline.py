"""
Reproducible CLI pipeline for StudentInsight Historical ML Subsystem.
Executes:
  1. Historical PDF/XLSX extraction (read-only) + SHA-256 incremental caching
  2. Normalization + cautious student identity resolution
  3. Student continuity analysis & eligibility classification
  4. Comprehensive data quality audit
  5. Feature engineering (clustering + leakage-free temporal supervised transitions)
  6. Unsupervised clustering experiments (K-Means K=2..8 + Agglomerative + DBSCAN)
  7. Supervised chronological prediction experiments (Regression & Classification)
  8. Model artifact saving, versioning, evaluation summary & optional selection
"""

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from app.ml.pipeline import (
    get_evaluation_overview,
    get_ml_status,
    process_historical_data,
    train_clustering_pipeline,
    train_supervised_pipeline,
)
from app.ml.registry import select_active_model


def main() -> None:
    parser = argparse.ArgumentParser(description="Run StudentInsight Historical ML Pipeline")
    parser.add_argument("--data-dir", type=str, default=None, help="Path to historical PDF/XLSX directory")
    parser.add_argument("--no-cache", action="store_true", help="Force re-parsing of all source files")
    parser.add_argument(
        "--select-recommended",
        action="store_true",
        help="Explicitly activate the recommended models after reviewing evaluation metrics",
    )
    args = parser.parse_args()

    print("=== [STAGE 1-6] Processing Historical Dataset ===")
    proc = process_historical_data(data_dir=args.data_dir, use_cache=not args.no_cache)
    if proc.get("status") != "SUCCESS":
        print("FAILED:", json.dumps(proc, indent=2, ensure_ascii=False))
        sys.exit(1)
    print(
        f"Dataset Version: {proc['dataset_version']} | Files: {proc['extraction_summary']['files_succeeded']}/"
        f"{proc['extraction_summary']['files_discovered']} | Records: {proc['extraction_summary']['total_records_extracted']} | "
        f"Unique Students: {proc['identity_summary']['unique_students_total']} | Quality: {proc['quality_status']}"
    )

    print("\n=== [STAGE 7-8] Training Unsupervised Clustering Models ===")
    clu = train_clustering_pipeline(dataset_version=proc["dataset_version"])
    print(
        f"Clustering Verdict: {clu.get('quality_verdict')} | Recommended K={clu.get('recommended_k')} | "
        f"Metrics: {json.dumps(clu.get('metrics', {}))}"
    )
    for prof in clu.get("cluster_profiles", []):
        print(
            f"  Cluster {prof['cluster_id']}: {prof['label']} | n={prof['student_count']} ({prof['percentage']}%) | "
            f"avg={prof['avg_points']} med={prof['median_points']} obs={prof['avg_observed_periods']}"
        )

    print("\n=== [STAGE 9-10] Training Supervised Temporal Prediction Models ===")
    sup = train_supervised_pipeline(dataset_version=proc["dataset_version"], task="BOTH")
    tv = sup.get("temporal_validation", {})
    print(f"Temporal Split: train={tv.get('train_samples')} ({tv.get('train_transitions')}) -> test={tv.get('test_samples')} ({tv.get('test_transition')})")

    reg = sup.get("regression", {})
    if reg:
        print("\n-- Regression Comparison (target: next_period_total_points) --")
        print("Baselines:", json.dumps({k: {m: v[m] for m in ("mae", "rmse", "r2")} for k, v in reg.get("baselines", {}).items()}))
        for row in reg.get("comparison_table", []):
            print(f"  {row['algorithm']:25s} | MAE={row['test_mae']:6.2f} RMSE={row['test_rmse']:6.2f} R2={row['test_r2']:7.4f} | CV_RMSE={row['cv_mean_rmse']:6.2f} {'*' if row['is_recommended'] else ''}")
        print("Adequate:", reg.get("model_adequate"), "|", reg.get("selection_reason"))

    cls = sup.get("classification", {})
    if cls and "comparison_table" in cls:
        print("\n-- Classification Comparison (target: next_period_point_tier) --")
        print("Thresholds:", json.dumps(cls.get("thresholds", {}), ensure_ascii=False))
        print("Train dist:", cls.get("train_class_distribution"), "| Test dist:", cls.get("test_class_distribution"))
        print("Baselines:", json.dumps({k: {m: v[m] for m in ("accuracy", "macro_f1", "balanced_accuracy")} for k, v in cls.get("baselines", {}).items()}))
        for row in cls.get("comparison_table", []):
            print(
                f"  {row['algorithm']:25s} | Acc={row['accuracy']:.4f} MacroF1={row['macro_f1']:.4f} "
                f"BalAcc={row['balanced_accuracy']:.4f} HighRec={row['high_class_recall']:.4f} | CV_F1={row['cv_mean_macro_f1']:.4f} {'*' if row['is_recommended'] else ''}"
            )
        print("Adequate:", cls.get("model_adequate"), "|", cls.get("selection_reason"))

    if args.select_recommended:
        print("\n=== [STAGE 11] Activating Reviewed Recommended Models ===")
        if clu.get("model"):
            m = select_active_model(clu["model"]["model_id"], notes="Activated after CLI evaluation review.")
            print("  Active CLUSTERING:", m["model_id"])
        for mrec in sup.get("registered_models", []):
            if mrec["model_type"] == "REGRESSION" and mrec["algorithm"] == reg.get("recommended_algorithm") and reg.get("model_adequate"):
                m = select_active_model(mrec["model_id"], notes="Activated after temporal validation review.")
                print("  Active REGRESSION:", m["model_id"])
            if mrec["model_type"] == "CLASSIFICATION" and mrec["algorithm"] == cls.get("recommended_algorithm") and cls.get("model_adequate"):
                m = select_active_model(mrec["model_id"], notes="Activated after temporal validation review.")
                print("  Active CLASSIFICATION:", m["model_id"])

    print("\n=== FINAL STATUS ===")
    status = get_ml_status()
    print(json.dumps({
        "dataset_version": status["latest_dataset_version"],
        "total_models": status["total_trained_models"],
        "selected": {k: (v["model_id"] if v else None) for k, v in status["selected_models"].items()},
    }, indent=2))


if __name__ == "__main__":
    main()
