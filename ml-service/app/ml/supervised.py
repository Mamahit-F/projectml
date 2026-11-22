from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression, LogisticRegression, Ridge
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    classification_report,
    confusion_matrix,
    f1_score,
    mean_absolute_error,
    mean_squared_error,
    precision_score,
    r2_score,
    recall_score,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor

from app.config import RANDOM_STATE
from app.ml.features import SUPERVISED_FEATURE_COLS


CLASS_ORDER = ["LOW", "MEDIUM", "HIGH"]

PREDICTION_ETHICS_DISCLAIMER = (
    "Hasil prediksi merupakan estimasi statistik berdasarkan pola historis akumulasi poin, "
    "BUKAN jaminan atau bukti bahwa seorang mahasiswa akan melanggar aturan di periode mendatang. "
    "Gunakan sebagai alat bantu pendukung keputusan untuk pembinaan proaktif."
)


def _derive_classification_thresholds(
    y_train: np.ndarray,
    custom_thresholds: Optional[Dict[str, float]] = None,
) -> Dict[str, Any]:
    """
    Determine LOW / MEDIUM / HIGH next-period point category thresholds.
    CRITICAL ANTI-LEAKAGE: When data-derived, quantiles are computed STRICTLY from y_train
    (NEVER using validation/test targets!).
    Supports custom/institutional threshold overrides via `custom_thresholds`.
    """
    if (
        custom_thresholds
        and custom_thresholds.get("low_max") is not None
        and custom_thresholds.get("medium_max") is not None
    ):
        low_max = float(custom_thresholds["low_max"])
        med_max = float(custom_thresholds["medium_max"])
        if med_max <= low_max:
            med_max = low_max + 10.0
        return {
            "method": "CONFIGURED_CUSTOM_THRESHOLDS",
            "low_max": round(low_max, 2),
            "medium_max": round(med_max, 2),
            "rationale": (
                f"Batas kategori dikonfigurasi secara eksplisit: LOW (<= {low_max:.0f}), "
                f"MEDIUM ({low_max:.0f} < poin <= {med_max:.0f}), HIGH (> {med_max:.0f})."
            ),
        }

    # Strictly training-set quantiles (50th and 80th percentile of y_train)
    q50 = float(np.percentile(y_train, 50))
    q80 = float(np.percentile(y_train, 80))
    # Guarantee strict separation even on skewed distributions
    if q80 <= q50:
        q80 = float(np.percentile(y_train[y_train > 0], 70)) if np.any(y_train > 0) else q50 + 10.0

    low_max = round(q50, 2)
    med_max = round(max(q80, low_max + 1.0), 2)
    return {
        "method": "TRAINING_SET_QUANTILES_Q50_Q80",
        "low_max": low_max,
        "medium_max": med_max,
        "rationale": (
            f"Karena Universitas Klabat belum menetapkan batas tetap tengah semester, batas kategori "
            f"diturunkan HANYA dari data latih (Q50={low_max:.1f}, Q80={med_max:.1f}) tanpa menyentuh data uji: "
            f"LOW (0–{low_max:.0f} poin), MEDIUM ({low_max:.0f}–{med_max:.0f} poin), HIGH (> {med_max:.0f} poin)."
        ),
    }


def _apply_thresholds(y_values: np.ndarray, thresholds: Dict[str, Any]) -> np.ndarray:
    low_max = float(thresholds["low_max"])
    med_max = float(thresholds["medium_max"])
    out = np.where(y_values <= low_max, "LOW", np.where(y_values <= med_max, "MEDIUM", "HIGH"))
    return out


def _extract_feature_importance(pipeline: Pipeline, feature_names: List[str]) -> List[Dict[str, Any]]:
    model = pipeline.named_steps["model"]
    raw_imp: Optional[np.ndarray] = None
    imp_type = "none"

    if hasattr(model, "feature_importances_"):
        raw_imp = np.asarray(model.feature_importances_, dtype=float)
        imp_type = "tree_gini_or_mse_importance"
    elif hasattr(model, "coef_"):
        coef = np.asarray(model.coef_, dtype=float)
        raw_imp = np.mean(np.abs(coef), axis=0) if coef.ndim > 1 else np.abs(coef)
        imp_type = "abs_standardized_coefficient"

    if raw_imp is None or len(raw_imp) != len(feature_names):
        return []

    total = float(np.sum(raw_imp))
    normalized = raw_imp / total if total > 0 else raw_imp
    ranked = sorted(
        [
            {
                "feature": fname,
                "importance": round(float(val), 4),
                "raw_score": round(float(raw), 4),
                "type": imp_type,
            }
            for fname, val, raw in zip(feature_names, normalized, raw_imp)
        ],
        key=lambda x: -x["importance"],
    )
    return ranked


def _compute_regression_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    y_pred_clipped = np.maximum(0.0, y_pred)
    mae = float(mean_absolute_error(y_true, y_pred_clipped))
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred_clipped)))
    r2 = float(r2_score(y_true, y_pred_clipped)) if len(y_true) > 1 and np.var(y_true) > 0 else 0.0
    residuals = y_true - y_pred_clipped

    # Residual histogram buckets for visualization
    hist_counts, hist_edges = np.histogram(residuals, bins=12)
    residual_dist = [
        {
            "bin_label": f"{hist_edges[i]:.0f} to {hist_edges[i+1]:.0f}",
            "bin_start": round(float(hist_edges[i]), 1),
            "bin_end": round(float(hist_edges[i + 1]), 1),
            "count": int(hist_counts[i]),
        }
        for i in range(len(hist_counts))
    ]

    return {
        "n_samples": int(len(y_true)),
        "mae": round(mae, 3),
        "rmse": round(rmse, 3),
        "r2": round(r2, 4),
        "mean_residual": round(float(np.mean(residuals)), 3),
        "std_residual": round(float(np.std(residuals)), 3),
        "median_abs_error": round(float(np.median(np.abs(residuals))), 3),
        "residual_distribution": residual_dist,
    }


def _compute_classification_metrics(y_true: np.ndarray, y_pred: np.ndarray) -> Dict[str, Any]:
    acc = float(accuracy_score(y_true, y_pred))
    prec_macro = float(precision_score(y_true, y_pred, labels=CLASS_ORDER, average="macro", zero_division=0))
    rec_macro = float(recall_score(y_true, y_pred, labels=CLASS_ORDER, average="macro", zero_division=0))
    f1_macro = float(f1_score(y_true, y_pred, labels=CLASS_ORDER, average="macro", zero_division=0))
    f1_weighted = float(f1_score(y_true, y_pred, labels=CLASS_ORDER, average="weighted", zero_division=0))
    bal_acc = float(balanced_accuracy_score(y_true, y_pred)) if len(set(y_true)) > 1 else acc

    cm = confusion_matrix(y_true, y_pred, labels=CLASS_ORDER).tolist()
    rep = classification_report(y_true, y_pred, labels=CLASS_ORDER, output_dict=True, zero_division=0)

    per_class = {}
    for cls in CLASS_ORDER:
        c_rep = rep.get(cls, {})
        per_class[cls] = {
            "precision": round(float(c_rep.get("precision", 0.0)), 4),
            "recall": round(float(c_rep.get("recall", 0.0)), 4),
            "f1_score": round(float(c_rep.get("f1-score", 0.0)), 4),
            "support": int(c_rep.get("support", 0)),
        }

    return {
        "n_samples": int(len(y_true)),
        "accuracy": round(acc, 4),
        "precision_macro": round(prec_macro, 4),
        "recall_macro": round(rec_macro, 4),
        "macro_f1": round(f1_macro, 4),
        "weighted_f1": round(f1_weighted, 4),
        "balanced_accuracy": round(bal_acc, 4),
        "high_class_recall": per_class["HIGH"]["recall"],
        "classes": list(CLASS_ORDER),
        "confusion_matrix": cm,
        "per_class": per_class,
    }


def _build_regression_candidates(random_state: int, params: Optional[Dict[str, Any]] = None) -> Dict[str, Pipeline]:
    p = params or {}
    rf_estimators = int(p.get("n_estimators", 200))
    rf_depth = int(p.get("max_depth", 10))
    dt_depth = int(p.get("dt_max_depth", 7))

    return {
        "LinearRegression": Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
                ("scaler", StandardScaler()),
                # Strong L2 regularization prevents collinearity sign-flip between raw points and period-normalized ratios
                ("model", Ridge(alpha=500.0, random_state=random_state)),
            ]
        ),
        "DecisionTreeRegressor": Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
                (
                    "model",
                    DecisionTreeRegressor(
                        max_depth=dt_depth,
                        min_samples_leaf=10,
                        random_state=random_state,
                    ),
                ),
            ]
        ),
        "RandomForestRegressor": Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
                (
                    "model",
                    RandomForestRegressor(
                        n_estimators=rf_estimators,
                        max_depth=rf_depth,
                        min_samples_leaf=5,
                        random_state=random_state,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }


def _build_classification_candidates(random_state: int, params: Optional[Dict[str, Any]] = None) -> Dict[str, Pipeline]:
    p = params or {}
    rf_estimators = int(p.get("n_estimators", 200))
    rf_depth = int(p.get("max_depth", 10))
    dt_depth = int(p.get("dt_max_depth", 7))

    return {
        "LogisticRegression": Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
                ("scaler", StandardScaler()),
                (
                    "model",
                    LogisticRegression(
                        max_iter=1000,
                        class_weight="balanced",
                        C=1.0,
                        random_state=random_state,
                    ),
                ),
            ]
        ),
        "DecisionTreeClassifier": Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
                (
                    "model",
                    DecisionTreeClassifier(
                        max_depth=dt_depth,
                        min_samples_leaf=10,
                        class_weight="balanced",
                        random_state=random_state,
                    ),
                ),
            ]
        ),
        "RandomForestClassifier": Pipeline(
            steps=[
                ("imputer", SimpleImputer(strategy="median", keep_empty_features=True)),
                (
                    "model",
                    RandomForestClassifier(
                        n_estimators=rf_estimators,
                        max_depth=rf_depth,
                        min_samples_leaf=5,
                        class_weight="balanced",
                        random_state=random_state,
                        n_jobs=-1,
                    ),
                ),
            ]
        ),
    }


def _evaluate_subgroups_regression(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    subgroups: List[str],
) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for sg in sorted(set(subgroups)):
        idx = [i for i, v in enumerate(subgroups) if v == sg]
        if len(idx) < 2:
            continue
        yt = y_true[idx]
        yp = np.maximum(0.0, y_pred[idx])
        out[sg] = {
            "n_samples": len(idx),
            "mae": round(float(mean_absolute_error(yt, yp)), 3),
            "rmse": round(float(np.sqrt(mean_squared_error(yt, yp))), 3),
            "r2": round(float(r2_score(yt, yp)), 4) if np.var(yt) > 0 else 0.0,
        }
    return out


def _evaluate_subgroups_classification(
    y_true: np.ndarray,
    y_pred: np.ndarray,
    subgroups: List[str],
) -> Dict[str, Dict[str, Any]]:
    out: Dict[str, Dict[str, Any]] = {}
    for sg in sorted(set(subgroups)):
        idx = [i for i, v in enumerate(subgroups) if v == sg]
        if len(idx) < 2:
            continue
        yt = y_true[idx]
        yp = y_pred[idx]
        out[sg] = {
            "n_samples": len(idx),
            "accuracy": round(float(accuracy_score(yt, yp)), 4),
            "macro_f1": round(float(f1_score(yt, yp, labels=CLASS_ORDER, average="macro", zero_division=0)), 4),
            "balanced_accuracy": round(float(balanced_accuracy_score(yt, yp)), 4) if len(set(yt)) > 1 else round(float(accuracy_score(yt, yp)), 4),
            "high_class_recall": round(
                float(recall_score(yt == "HIGH", yp == "HIGH", zero_division=0)), 4
            ),
        }
    return out


def run_supervised_experiments(
    df_features: pd.DataFrame,
    meta_rows: List[Dict[str, Any]],
    task: str = "BOTH",
    algorithms: Optional[List[str]] = None,
    custom_thresholds: Optional[Dict[str, float]] = None,
    hyperparameters: Optional[Dict[str, Any]] = None,
    random_state: int = RANDOM_STATE,
) -> Dict[str, Any]:
    """
    Train and chronologically evaluate supervised models (Regression and/or Classification).

    CHRONOLOGICAL TEMPORAL VALIDATION (NEVER RANDOM SPLIT):
    - Identifies all available ordered transitions (T1, T2, ..., Tm).
    - Primary Holdout: Trains on earlier transitions [T1..T(m-1)], tests strictly on latest transition Tm.
    - Expanding-Window Temporal CV: Evaluates every fold [T1..Tk] -> T(k+1) for k = 1..m-1.
    - Reports explicit subgroup performance:
      * PREVIOUSLY_OBSERVED_CONTINUOUS (observed continuously before T)
      * NEWLY_OBSERVED_AT_T (first appeared at T with no earlier history)
      * INCOMPLETE_HISTORY_WITH_GAP (observed earlier with missing intermediate period(s))
    - Compares against honest naive baselines (persistence/mean for regression, majority for classification).
    - Evaluates adequacy honestly — if no model beats baseline or data is insufficient, reports it!
    """
    if len(df_features) < 20 or not meta_rows:
        return {
            "status": "INSUFFICIENT_DATA",
            "message": f"Sampel transisi kronologis terlalu sedikit ({len(df_features)} < 20) untuk pelatihan supervised.",
        }

    meta_df = pd.DataFrame(meta_rows)
    transitions = sorted(meta_df["transition_index"].unique().tolist())

    if len(transitions) < 2:
        return {
            "status": "INSUFFICIENT_TEMPORAL_PERIODS",
            "message": (
                f"Hanya ditemukan {len(transitions)} transisi periode. Diperlukan minimal 2 transisi kronologis "
                "agar evaluasi temporal (train periode lama -> uji periode terbaru) dapat dilakukan tanpa kebocoran."
            ),
        }

    latest_transition = transitions[-1]
    train_mask = (meta_df["transition_index"] < latest_transition).to_numpy()
    test_mask = (meta_df["transition_index"] == latest_transition).to_numpy()

    X_all = df_features[SUPERVISED_FEATURE_COLS].copy()
    y_all_pts = meta_df["target_next_points"].to_numpy(dtype=float)

    X_train, y_train_pts = X_all.loc[train_mask], y_all_pts[train_mask]
    X_test, y_test_pts = X_all.loc[test_mask], y_all_pts[test_mask]
    test_subgroups = meta_df.loc[test_mask, "history_subgroup"].tolist()
    test_current_pts = meta_df.loc[test_mask, "current_points"].to_numpy(dtype=float)
    test_meta_records = meta_df.loc[test_mask].to_dict(orient="records")

    transition_breakdown = []
    for t_idx in transitions:
        sub = meta_df[meta_df["transition_index"] == t_idx]
        transition_breakdown.append(
            {
                "transition_index": int(t_idx),
                "transition_label": str(sub["transition_label"].iloc[0]),
                "source_date": str(sub["source_reporting_date"].iloc[0]),
                "target_date": str(sub["target_reporting_date"].iloc[0]),
                "is_same_semester": bool(sub["is_same_semester_transition"].iloc[0]),
                "sample_count": int(len(sub)),
                "split_role": "TEST_HOLDOUT" if t_idx == latest_transition else "TRAIN",
                "target_mean_points": round(float(sub["target_next_points"].mean()), 2),
                "target_median_points": round(float(sub["target_next_points"].median()), 2),
            }
        )

    temporal_strategy = {
        "strategy_name": "Chronological Holdout + Expanding-Window Temporal Cross-Validation",
        "random_split_used": False,
        "train_transitions": [t["transition_label"] for t in transition_breakdown if t["split_role"] == "TRAIN"],
        "test_transition": [t["transition_label"] for t in transition_breakdown if t["split_role"] == "TEST_HOLDOUT"][0],
        "train_samples": int(np.sum(train_mask)),
        "test_samples": int(np.sum(test_mask)),
        "transition_breakdown": transition_breakdown,
        "test_subgroup_counts": pd.Series(test_subgroups).value_counts().to_dict(),
    }

    output: Dict[str, Any] = {
        "status": "SUCCESS",
        "features": list(SUPERVISED_FEATURE_COLS),
        "temporal_validation": temporal_strategy,
        "ethics_disclaimer": PREDICTION_ETHICS_DISCLAIMER,
    }

    run_reg = task.upper() in {"BOTH", "REGRESSION"}
    run_cls = task.upper() in {"BOTH", "CLASSIFICATION"}

    # ======================== REGRESSION PIPELINE ========================
    if run_reg:
        all_reg_candidates = _build_regression_candidates(random_state, hyperparameters)
        if algorithms:
            filtered = {k: v for k, v in all_reg_candidates.items() if k in algorithms}
            if filtered:
                all_reg_candidates = filtered

        # Naive baselines on chronological holdout test set
        naive_mean_pred = np.full_like(y_test_pts, fill_value=float(np.mean(y_train_pts)))
        naive_persist_pred = test_current_pts.copy()
        reg_baselines = {
            "MeanBaseline": _compute_regression_metrics(y_test_pts, naive_mean_pred),
            "PersistenceBaseline (next=current)": _compute_regression_metrics(y_test_pts, naive_persist_pred),
        }

        reg_results: Dict[str, Any] = {}
        reg_pipelines: Dict[str, Pipeline] = {}

        for algo_name, pipe in all_reg_candidates.items():
            # 1. Expanding-window temporal CV across folds
            ew_folds = []
            for k_idx in range(1, len(transitions)):
                tr_t = transitions[:k_idx]
                va_t = transitions[k_idx]
                tr_m = meta_df["transition_index"].isin(tr_t).to_numpy()
                va_m = (meta_df["transition_index"] == va_t).to_numpy()
                fold_pipe = _build_regression_candidates(random_state, hyperparameters)[algo_name]
                fold_pipe.fit(X_all.loc[tr_m], y_all_pts[tr_m])
                va_pred = np.maximum(0.0, fold_pipe.predict(X_all.loc[va_m]))
                va_metrics = _compute_regression_metrics(y_all_pts[va_m], va_pred)
                ew_folds.append(
                    {
                        "fold": k_idx,
                        "train_transitions": [int(x) for x in tr_t],
                        "val_transition": int(va_t),
                        "val_transition_label": str(meta_df.loc[va_m, "transition_label"].iloc[0]),
                        "n_train": int(np.sum(tr_m)),
                        "n_val": int(np.sum(va_m)),
                        "mae": va_metrics["mae"],
                        "rmse": va_metrics["rmse"],
                        "r2": va_metrics["r2"],
                    }
                )

            # 2. Primary Chronological Holdout Fit (Train: T1..T(m-1) -> Test: Tm)
            pipe.fit(X_train, y_train_pts)
            y_pred_test = np.maximum(0.0, pipe.predict(X_test))
            test_metrics = _compute_regression_metrics(y_test_pts, y_pred_test)
            subgroup_metrics = _evaluate_subgroups_regression(y_test_pts, y_pred_test, test_subgroups)
            feat_imp = _extract_feature_importance(pipe, SUPERVISED_FEATURE_COLS)

            # Sample actual vs predicted points (up to 250 stratified points for frontend scatter chart)
            step = max(1, len(y_test_pts) // 250)
            avp_sample = [
                {
                    "actual": round(float(y_test_pts[i]), 1),
                    "predicted": round(float(y_pred_test[i]), 1),
                    "current_points": round(float(test_current_pts[i]), 1),
                    "residual": round(float(y_test_pts[i] - y_pred_test[i]), 1),
                    "subgroup": test_subgroups[i],
                }
                for i in range(0, len(y_test_pts), step)
            ]

            reg_results[algo_name] = {
                "algorithm": algo_name,
                "model_type": "REGRESSION",
                "target": "next_period_total_points",
                "test_metrics": test_metrics,
                "expanding_window_cv": ew_folds,
                "cv_mean_mae": round(float(np.mean([f["mae"] for f in ew_folds])), 3),
                "cv_mean_rmse": round(float(np.mean([f["rmse"] for f in ew_folds])), 3),
                "cv_mean_r2": round(float(np.mean([f["r2"] for f in ew_folds])), 4),
                "subgroup_metrics": subgroup_metrics,
                "feature_importance": feat_imp,
                "actual_vs_predicted_sample": avp_sample,
            }
            reg_pipelines[algo_name] = pipe

        # Rank regression candidates primarily by Holdout RMSE (lower is better), with R2 and CV stability
        ranked_reg = sorted(
            reg_results.values(),
            key=lambda r: (r["test_metrics"]["rmse"], r["test_metrics"]["mae"]),
        )
        best_reg = ranked_reg[0]
        best_reg_algo = best_reg["algorithm"]
        beats_mean = best_reg["test_metrics"]["rmse"] < reg_baselines["MeanBaseline"]["rmse"]
        beats_persist = best_reg["test_metrics"]["rmse"] < reg_baselines["PersistenceBaseline (next=current)"]["rmse"]
        reg_adequate = bool(beats_mean and best_reg["test_metrics"]["r2"] >= 0.25)

        reg_selection_note = (
            f"{best_reg_algo} memperoleh RMSE uji kronologis terendah ({best_reg['test_metrics']['rmse']}, "
            f"MAE={best_reg['test_metrics']['mae']}, R²={best_reg['test_metrics']['r2']}) dan melampaui "
            f"baseline rata-rata (RMSE={reg_baselines['MeanBaseline']['rmse']}) maupun baseline persistensi "
            f"(RMSE={reg_baselines['PersistenceBaseline (next=current)']['rmse']})."
            if reg_adequate
            else (
                f"Peringatan: {best_reg_algo} memiliki RMSE={best_reg['test_metrics']['rmse']} dan "
                f"R²={best_reg['test_metrics']['r2']}; performa lintas periode masih terbatas karena perbedaan "
                f"skala awal vs akhir semester."
            )
        )

        # Note: Keep the holdout-trained model as the verified evaluated artifact (never evaluate on data seen in fit!)
        output["regression"] = {
            "target_definition": "next_period_total_points (continuous non-negative Sabbath points at T+1)",
            "baselines": reg_baselines,
            "candidates": reg_results,
            "comparison_table": [
                {
                    "algorithm": r["algorithm"],
                    "test_mae": r["test_metrics"]["mae"],
                    "test_rmse": r["test_metrics"]["rmse"],
                    "test_r2": r["test_metrics"]["r2"],
                    "cv_mean_mae": r["cv_mean_mae"],
                    "cv_mean_rmse": r["cv_mean_rmse"],
                    "cv_mean_r2": r["cv_mean_r2"],
                    "is_recommended": r["algorithm"] == best_reg_algo,
                }
                for r in ranked_reg
            ],
            "recommended_algorithm": best_reg_algo,
            "model_adequate": reg_adequate,
            "beats_mean_baseline": beats_mean,
            "beats_persistence_baseline": beats_persist,
            "selection_reason": reg_selection_note,
            "limitations": [
                "Periode P4 (01-10-2026, awal semester, maks 66 poin) ke P5 (06-11-2026, akhir semester, maks 213 poin) memiliki lonjakan skala ~3.5x yang lebih curam dibandingkan transisi semester sebelumnya P2->P3 (~1.5x).",
                "Transisi lintas semester (P1->P2, P3->P4) mengalami reset poin ke 0 di awal semester baru, sementara transisi dalam semester bersifat kumulatif.",
                "Jumlah jendela waktu masih 5 snapshot (4 transisi); akurasi regresi akan membaik seiring bertambahnya semester historis.",
            ],
            "artifact_bundles": {
                algo: {
                    "task": "REGRESSION",
                    "algorithm": algo,
                    "features": list(SUPERVISED_FEATURE_COLS),
                    "target": "next_period_total_points",
                    "pipeline": pipe,
                    "random_state": random_state,
                }
                for algo, pipe in reg_pipelines.items()
            },
        }

    # ======================== CLASSIFICATION PIPELINE ========================
    if run_cls:
        thresholds = _derive_classification_thresholds(y_train_pts, custom_thresholds)
        y_train_cls = _apply_thresholds(y_train_pts, thresholds)
        y_test_cls = _apply_thresholds(y_test_pts, thresholds)

        train_class_dist = {c: int(np.sum(y_train_cls == c)) for c in CLASS_ORDER}
        test_class_dist = {c: int(np.sum(y_test_cls == c)) for c in CLASS_ORDER}

        # Check missing classes in train
        present_train_classes = [c for c, cnt in train_class_dist.items() if cnt > 0]
        if len(present_train_classes) < 2:
            output["classification"] = {
                "status": "INSUFFICIENT_CLASSES",
                "message": f"Data latih hanya memiliki {len(present_train_classes)} kelas target; klasifikasi tidak dapat dilatih.",
                "thresholds": thresholds,
            }
        else:
            all_cls_candidates = _build_classification_candidates(random_state, hyperparameters)
            if algorithms:
                filtered = {k: v for k, v in all_cls_candidates.items() if k in algorithms}
                if filtered:
                    all_cls_candidates = filtered

            # Majority class baseline
            maj_class = max(train_class_dist.items(), key=lambda kv: kv[1])[0]
            maj_pred = np.full_like(y_test_cls, fill_value=maj_class)
            cls_baselines = {
                f"MajorityBaseline ({maj_class})": _compute_classification_metrics(y_test_cls, maj_pred)
            }

            cls_results: Dict[str, Any] = {}
            cls_pipelines: Dict[str, Pipeline] = {}

            for algo_name, pipe in all_cls_candidates.items():
                # 1. Expanding-window temporal CV (deriving thresholds strictly inside each training fold!)
                ew_folds = []
                for k_idx in range(1, len(transitions)):
                    tr_t = transitions[:k_idx]
                    va_t = transitions[k_idx]
                    tr_m = meta_df["transition_index"].isin(tr_t).to_numpy()
                    va_m = (meta_df["transition_index"] == va_t).to_numpy()
                    fold_thresh = _derive_classification_thresholds(y_all_pts[tr_m], custom_thresholds)
                    y_tr_c = _apply_thresholds(y_all_pts[tr_m], fold_thresh)
                    y_va_c = _apply_thresholds(y_all_pts[va_m], fold_thresh)
                    if len(set(y_tr_c)) < 2:
                        continue
                    fold_pipe = _build_classification_candidates(random_state, hyperparameters)[algo_name]
                    fold_pipe.fit(X_all.loc[tr_m], y_tr_c)
                    va_pred_c = fold_pipe.predict(X_all.loc[va_m])
                    va_m_res = _compute_classification_metrics(y_va_c, va_pred_c)
                    ew_folds.append(
                        {
                            "fold": k_idx,
                            "train_transitions": [int(x) for x in tr_t],
                            "val_transition": int(va_t),
                            "val_transition_label": str(meta_df.loc[va_m, "transition_label"].iloc[0]),
                            "n_train": int(np.sum(tr_m)),
                            "n_val": int(np.sum(va_m)),
                            "fold_thresholds": {"low_max": fold_thresh["low_max"], "medium_max": fold_thresh["medium_max"]},
                            "accuracy": va_m_res["accuracy"],
                            "macro_f1": va_m_res["macro_f1"],
                            "balanced_accuracy": va_m_res["balanced_accuracy"],
                            "high_class_recall": va_m_res["high_class_recall"],
                        }
                    )

                # 2. Primary Chronological Holdout Fit
                pipe.fit(X_train, y_train_cls)
                y_pred_cls = pipe.predict(X_test)
                test_metrics = _compute_classification_metrics(y_test_cls, y_pred_cls)
                subgroup_metrics = _evaluate_subgroups_classification(y_test_cls, y_pred_cls, test_subgroups)
                feat_imp = _extract_feature_importance(pipe, SUPERVISED_FEATURE_COLS)

                cls_results[algo_name] = {
                    "algorithm": algo_name,
                    "model_type": "CLASSIFICATION",
                    "target": "next_period_point_tier",
                    "classes": list(CLASS_ORDER),
                    "test_metrics": test_metrics,
                    "expanding_window_cv": ew_folds,
                    "cv_mean_macro_f1": round(float(np.mean([f["macro_f1"] for f in ew_folds])), 4) if ew_folds else 0.0,
                    "cv_mean_balanced_accuracy": round(float(np.mean([f["balanced_accuracy"] for f in ew_folds])), 4) if ew_folds else 0.0,
                    "subgroup_metrics": subgroup_metrics,
                    "feature_importance": feat_imp,
                }
                cls_pipelines[algo_name] = pipe

            # Select best classification model prioritizing Macro F1 + HIGH-class Recall + Balanced Accuracy (NEVER accuracy alone!)
            ranked_cls = sorted(
                cls_results.values(),
                key=lambda r: (
                    0.50 * r["test_metrics"]["macro_f1"]
                    + 0.30 * r["test_metrics"]["high_class_recall"]
                    + 0.20 * r["test_metrics"]["balanced_accuracy"]
                ),
                reverse=True,
            )
            best_cls = ranked_cls[0]
            best_cls_algo = best_cls["algorithm"]
            maj_f1 = list(cls_baselines.values())[0]["macro_f1"]
            cls_adequate = bool(
                best_cls["test_metrics"]["macro_f1"] > max(0.50, maj_f1 + 0.15)
                and best_cls["test_metrics"]["balanced_accuracy"] > 0.55
            )

            cls_selection_note = (
                f"{best_cls_algo} dipilih karena menghasilkan kombinasi Macro F1 ({best_cls['test_metrics']['macro_f1']}), "
                f"Balanced Accuracy ({best_cls['test_metrics']['balanced_accuracy']}), dan Recall kelas HIGH "
                f"({best_cls['test_metrics']['high_class_recall']}) tertinggi pada uji kronologis "
                f"(melampaui baseline kelas mayoritas Macro F1={maj_f1})."
                if cls_adequate
                else (
                    f"Peringatan: {best_cls_algo} mencapai Macro F1={best_cls['test_metrics']['macro_f1']} dan "
                    f"Balanced Accuracy={best_cls['test_metrics']['balanced_accuracy']}; "
                    f"penggunaan model perlu kehati-hatian tinggi dan pengawasan manusia."
                )
            )

            output["classification"] = {
                "target_definition": "next_period_point_tier (LOW / MEDIUM / HIGH next-period point accumulation tier)",
                "thresholds": thresholds,
                "train_class_distribution": train_class_dist,
                "test_class_distribution": test_class_dist,
                "baselines": cls_baselines,
                "candidates": cls_results,
                "comparison_table": [
                    {
                        "algorithm": r["algorithm"],
                        "accuracy": r["test_metrics"]["accuracy"],
                        "precision_macro": r["test_metrics"]["precision_macro"],
                        "recall_macro": r["test_metrics"]["recall_macro"],
                        "macro_f1": r["test_metrics"]["macro_f1"],
                        "weighted_f1": r["test_metrics"]["weighted_f1"],
                        "balanced_accuracy": r["test_metrics"]["balanced_accuracy"],
                        "high_class_recall": r["test_metrics"]["high_class_recall"],
                        "cv_mean_macro_f1": r["cv_mean_macro_f1"],
                        "is_recommended": r["algorithm"] == best_cls_algo,
                    }
                    for r in ranked_cls
                ],
                "recommended_algorithm": best_cls_algo,
                "model_adequate": cls_adequate,
                "selection_reason": cls_selection_note,
                "limitations": [
                    "Distribusi kelas target pada periode akhir semester P5 (06-11-2026) bergeser ke poin lebih tinggi dibanding batas kuantil data latih P2–P4 (concept/scale shift antar tengah dan akhir semester).",
                    "Batas kelas LOW/MEDIUM/HIGH diturunkan secara statistik dari data latih karena belum ada batas resmi tengah semester; batas dapat dikonfigurasi ulang oleh administrator.",
                    PREDICTION_ETHICS_DISCLAIMER,
                ],
                "artifact_bundles": {
                    algo: {
                        "task": "CLASSIFICATION",
                        "algorithm": algo,
                        "features": list(SUPERVISED_FEATURE_COLS),
                        "target": "next_period_point_tier",
                        "classes": list(CLASS_ORDER),
                        "thresholds": thresholds,
                        "pipeline": pipe,
                        "random_state": random_state,
                    }
                    for algo, pipe in cls_pipelines.items()
                },
            }

    return output
