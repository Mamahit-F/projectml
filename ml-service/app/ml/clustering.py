from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd
from sklearn.cluster import AgglomerativeClustering, DBSCAN, KMeans
from sklearn.decomposition import PCA
from sklearn.impute import SimpleImputer
from sklearn.metrics import calinski_harabasz_score, davies_bouldin_score, silhouette_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.config import RANDOM_STATE
from app.ml.features import CLUSTERING_FEATURE_COLS


CLUSTERING_ETHICS_DISCLAIMER = (
    "Klaster yang ditemukan merupakan pengelompokan pola statistik akumulasi poin historis "
    "(unsupervised machine learning), BUKAN klasifikasi risiko disiplin atau akademik yang telah divalidasi. "
    "Nomor klaster bersifat arbitrer dan hanya digunakan sebagai pendukung analisis untuk peninjauan manusia."
)


def _generate_descriptive_cluster_labels(cluster_profiles: List[Dict[str, Any]]) -> Dict[int, Tuple[str, str]]:
    """
    Assign human-readable descriptive labels & interpretations strictly from each cluster's
    observed statistical characteristics (mean points, median, percentile, trend).
    NEVER assumes Cluster 0 = low or Cluster 1 = high; NEVER uses discriminatory or disciplinary-risk labels.
    """
    sorted_profiles = sorted(cluster_profiles, key=lambda p: (p["avg_points"], p["avg_percentile"]))
    n_clusters = len(sorted_profiles)
    labels: Dict[int, Tuple[str, str]] = {}

    for rank, prof in enumerate(sorted_profiles):
        cid = prof["cluster_id"]
        avg_p = prof["avg_points"]
        med_p = prof["median_points"]
        slope = prof["avg_trend_slope"]
        obs = prof["avg_observed_periods"]
        pos_freq = prof["avg_positive_freq"]
        hist_tag = "Long History" if obs >= 3.5 else "Partial/Short History"

        if avg_p <= 3.0 and med_p == 0.0:
            label = "Minimal / Zero Point Accumulation Profile"
            interp = (
                f"Kelompok mahasiswa dengan akumulasi poin sangat rendah atau 0 (rata-rata {avg_p:.1f} poin, "
                f"median {med_p:.1f}, frekuensi periode berpoin {pos_freq*100:.0f}%)."
            )
        elif avg_p >= 95.0:
            label = f"Very High Point Accumulation Profile ({hist_tag})"
            interp = (
                f"Kelompok dengan akumulasi poin historis tertinggi (rata-rata {avg_p:.1f} poin, "
                f"median {med_p:.1f}, rata-rata {obs:.1f} periode terobservasi). Memerlukan peninjauan dukungan pembinaan."
            )
        elif avg_p >= 55.0:
            trend_word = "Increasing" if slope >= 6.0 else "Sustained"
            label = f"High & {trend_word} Accumulation Profile ({hist_tag})"
            interp = (
                f"Kelompok akumulasi poin tinggi (rata-rata {avg_p:.1f} poin, median {med_p:.1f}, "
                f"rata-rata {obs:.1f} periode terobservasi, kemiringan tren {slope:+.1f})."
            )
        elif avg_p <= 15.0:
            if slope >= 8.0:
                label = f"Low-to-Increasing Point Profile ({hist_tag})"
            else:
                label = f"Low & Stable Point Profile ({hist_tag})"
            interp = (
                f"Kelompok akumulasi poin rendah dan relatif stabil (rata-rata {avg_p:.1f} poin, "
                f"median {med_p:.1f}, rata-rata {obs:.1f} periode terobservasi)."
            )
        else:
            if slope >= 6.0:
                label = f"Moderate & Increasing Accumulation Profile ({hist_tag})"
            elif slope <= -4.0:
                label = f"Moderate & Decreasing Accumulation Profile ({hist_tag})"
            else:
                label = f"Moderate & Stable Accumulation Profile ({hist_tag})"
            interp = (
                f"Kelompok akumulasi poin menengah (rata-rata {avg_p:.1f} poin, median {med_p:.1f}, "
                f"rata-rata {obs:.1f} periode terobservasi, tren {slope:+.1f})."
            )

        existing_labels = {v[0] for v in labels.values()}
        if label in existing_labels:
            label = f"{label} #{rank + 1}"

        labels[cid] = (label, interp)

    return labels


def _summarize_clusters(
    df_features: pd.DataFrame,
    meta_rows: List[Dict[str, Any]],
    labels_arr: np.ndarray,
    pca_coords: np.ndarray,
) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    total_n = len(labels_arr)
    unique_cids = sorted(int(c) for c in set(labels_arr) if int(c) != -1)

    raw_profiles: List[Dict[str, Any]] = []
    for cid in unique_cids:
        mask = labels_arr == cid
        sub = df_features.loc[mask]
        pts = sub["mean_points"].to_numpy()
        latest = sub["latest_points"].to_numpy()

        raw_profiles.append(
            {
                "cluster_id": cid,
                "student_count": int(np.sum(mask)),
                "percentage": round(float(np.sum(mask) / max(1, total_n) * 100.0), 2),
                "avg_points": round(float(np.mean(pts)), 2),
                "median_points": round(float(np.median(pts)), 2),
                "min_points": round(float(np.min(pts)), 2),
                "q25_points": round(float(np.percentile(pts, 25)), 2),
                "q75_points": round(float(np.percentile(pts, 75)), 2),
                "max_points": round(float(np.max(pts)), 2),
                "avg_latest_points": round(float(np.mean(latest)), 2),
                "avg_percentile": round(float(sub["mean_period_percentile"].mean()), 2),
                "avg_trend_slope": round(float(sub["point_trend_slope"].mean()), 2),
                "avg_observed_periods": round(float(sub["observed_periods_count"].mean()), 2),
                "avg_missing_periods": round(float(sub["missing_periods_count"].mean()), 2),
                "avg_positive_freq": round(float(sub["freq_positive_periods"].mean()), 3),
                "avg_high_freq": round(float(sub["freq_high_point_periods"].mean()), 3),
            }
        )

    label_map = _generate_descriptive_cluster_labels(raw_profiles)
    for p in raw_profiles:
        lbl, interp = label_map[p["cluster_id"]]
        p["label"] = lbl
        p["interpretation"] = interp

    # Sort presentation order by avg_points ascending for clean dashboard readability
    raw_profiles.sort(key=lambda p: p["avg_points"])

    assignments: List[Dict[str, Any]] = []
    for i, meta in enumerate(meta_rows):
        cid = int(labels_arr[i])
        if cid == -1:
            lbl = "Unassigned / Density Noise"
        else:
            lbl = label_map[cid][0]
        assignments.append(
            {
                "internal_student_id": meta["internal_student_id"],
                "nim": meta["nim"],
                "student_name": meta["student_name"],
                "faculty": meta["faculty"],
                "study_program": meta["study_program"],
                "continuity_status": meta["continuity_status"],
                "cluster_id": cid,
                "cluster_label": lbl,
                "mean_points": round(float(df_features.iloc[i]["mean_points"]), 2),
                "latest_points": round(float(df_features.iloc[i]["latest_points"]), 2),
                "mean_period_percentile": round(float(df_features.iloc[i]["mean_period_percentile"]), 2),
                "observed_periods_count": int(df_features.iloc[i]["observed_periods_count"]),
                "pca_x": round(float(pca_coords[i, 0]), 4),
                "pca_y": round(float(pca_coords[i, 1]), 4),
            }
        )

    return raw_profiles, assignments


def run_clustering_experiments(
    df_features: pd.DataFrame,
    meta_rows: List[Dict[str, Any]],
    k_min: int = 2,
    k_max: int = 8,
    include_alternatives: bool = True,
    preferred_k: Optional[int] = None,
    random_state: int = RANDOM_STATE,
) -> Dict[str, Any]:
    """
    Train and evaluate multiple clustering configurations (K-Means for K=k_min..k_max,
    plus Agglomerative Clustering and DBSCAN for comparative analysis).
    Selects the best balanced & interpretable K-Means configuration (or user-specified K)
    and returns full evaluation metrics, cluster profiles, student assignments, and serialized artifact bundle.
    """
    n_samples = len(df_features)
    if n_samples < 10:
        return {
            "status": "INSUFFICIENT_DATA",
            "message": f"Jumlah mahasiswa layak klastering terlalu sedikit ({n_samples} < 10).",
            "candidates": [],
        }

    # Adapt K range safely to dataset size
    effective_k_max = min(k_max, max(2, n_samples // 15))
    effective_k_min = max(2, min(k_min, effective_k_max))

    prep = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    X_scaled = prep.fit_transform(df_features[CLUSTERING_FEATURE_COLS])

    # 2D PCA strictly for human-readable scatter plot visualization
    pca = PCA(n_components=2, random_state=random_state)
    pca_coords = pca.fit_transform(X_scaled)
    pca_explained = [round(float(v * 100.0), 2) for v in pca.explained_variance_ratio_]

    candidates: List[Dict[str, Any]] = []
    kmeans_models: Dict[int, Tuple[KMeans, np.ndarray]] = {}

    for k in range(effective_k_min, effective_k_max + 1):
        km = KMeans(n_clusters=k, random_state=random_state, n_init=20)
        labels = km.fit_predict(X_scaled)
        kmeans_models[k] = (km, labels)

        counts = np.bincount(labels)
        min_size = int(np.min(counts))
        max_size = int(np.max(counts))
        min_ratio = float(min_size / n_samples)
        balance_ratio = float(min_size / max(1, max_size))

        sil = float(silhouette_score(X_scaled, labels))
        db = float(davies_bouldin_score(X_scaled, labels))
        ch = float(calinski_harabasz_score(X_scaled, labels))

        # Interpretability & practical balance score (prevents selecting degenerate tiny outlier clusters)
        # Prefer 3..5 clusters when metrics are strong and every cluster has >= 3% of students
        practical_k_bonus = 0.04 if 3 <= k <= 5 else 0.0
        tiny_cluster_penalty = 0.15 if min_ratio < 0.03 else 0.0
        composite_score = sil - 0.05 * db + practical_k_bonus - tiny_cluster_penalty

        candidates.append(
            {
                "algorithm": "KMeans",
                "k": k,
                "silhouette_score": round(sil, 4),
                "davies_bouldin_index": round(db, 4),
                "calinski_harabasz_score": round(ch, 2),
                "inertia": round(float(km.inertia_), 2),
                "min_cluster_size": min_size,
                "max_cluster_size": max_size,
                "min_cluster_pct": round(min_ratio * 100.0, 2),
                "cluster_balance_ratio": round(balance_ratio, 4),
                "cluster_sizes": [int(c) for c in counts],
                "selection_composite_score": round(composite_score, 4),
                "supports_inference": True,
            }
        )

    # Pick recommended K-Means configuration (or respect explicit preferred_k if valid)
    kmeans_candidates = [c for c in candidates if c["algorithm"] == "KMeans"]
    if preferred_k is not None and preferred_k in kmeans_models:
        best_km_cand = next(c for c in kmeans_candidates if c["k"] == preferred_k)
        selection_reason = f"K={preferred_k} dipilih sesuai konfigurasi parameter pelatihan."
    else:
        best_km_cand = max(kmeans_candidates, key=lambda c: c["selection_composite_score"])
        selection_reason = (
            f"K={best_km_cand['k']} dipilih berdasarkan keseimbangan terbaik antara Silhouette Score "
            f"({best_km_cand['silhouette_score']}), Davies-Bouldin Index ({best_km_cand['davies_bouldin_index']}), "
            f"proporsi ukuran klaster minimum ({best_km_cand['min_cluster_pct']}%), dan kemudahan interpretasi profil."
        )

    best_k = int(best_km_cand["k"])
    best_km_model, best_labels = kmeans_models[best_k]

    # Evaluate comparative clustering algorithms (Agglomerative & DBSCAN)
    comparison_algorithms: List[Dict[str, Any]] = [
        {
            **best_km_cand,
            "is_recommended": True,
            "notes": "Algoritma utama; mendukung prediksi klaster untuk mahasiswa baru secara konsisten.",
        }
    ]

    if include_alternatives and n_samples <= 6000:
        # Agglomerative Clustering with Ward linkage at same best_k
        agg = AgglomerativeClustering(n_clusters=best_k, linkage="ward")
        agg_labels = agg.fit_predict(X_scaled)
        agg_counts = np.bincount(agg_labels)
        comparison_algorithms.append(
            {
                "algorithm": "AgglomerativeClustering (Ward)",
                "k": best_k,
                "silhouette_score": round(float(silhouette_score(X_scaled, agg_labels)), 4),
                "davies_bouldin_index": round(float(davies_bouldin_score(X_scaled, agg_labels)), 4),
                "calinski_harabasz_score": round(float(calinski_harabasz_score(X_scaled, agg_labels)), 2),
                "min_cluster_size": int(np.min(agg_counts)),
                "max_cluster_size": int(np.max(agg_counts)),
                "min_cluster_pct": round(float(np.min(agg_counts) / n_samples * 100.0), 2),
                "cluster_balance_ratio": round(float(np.min(agg_counts) / max(1, np.max(agg_counts))), 4),
                "cluster_sizes": [int(c) for c in agg_counts],
                "supports_inference": False,
                "is_recommended": False,
                "notes": "Pembanding hierarkis; tidak menyediakan fungsi .predict() langsung untuk observasi baru.",
            }
        )

        # DBSCAN density clustering comparison
        dbscan = DBSCAN(eps=1.8, min_samples=15)
        db_labels = dbscan.fit_predict(X_scaled)
        non_noise_mask = db_labels != -1
        unique_non_noise = set(db_labels[non_noise_mask])
        noise_pct = round(float(np.mean(~non_noise_mask) * 100.0), 2)
        if len(unique_non_noise) >= 2 and int(np.sum(non_noise_mask)) >= 20:
            db_sil = round(float(silhouette_score(X_scaled[non_noise_mask], db_labels[non_noise_mask])), 4)
            db_dbi = round(float(davies_bouldin_score(X_scaled[non_noise_mask], db_labels[non_noise_mask])), 4)
            db_ch = round(float(calinski_harabasz_score(X_scaled[non_noise_mask], db_labels[non_noise_mask])), 2)
            sizes = [int(np.sum(db_labels == c)) for c in sorted(unique_non_noise)]
        else:
            db_sil, db_dbi, db_ch, sizes = None, None, None, []
        comparison_algorithms.append(
            {
                "algorithm": "DBSCAN (eps=1.8, min_samples=15)",
                "k": len(unique_non_noise),
                "silhouette_score": db_sil,
                "davies_bouldin_index": db_dbi,
                "calinski_harabasz_score": db_ch,
                "noise_percentage": noise_pct,
                "cluster_sizes": sizes,
                "supports_inference": False,
                "is_recommended": False,
                "notes": f"Berbasis kepadatan; {noise_pct}% observasi dikategorikan noise; kurang seimbang untuk profil populasi mahasiswa.",
            }
        )

    profiles, assignments = _summarize_clusters(df_features, meta_rows, best_labels, pca_coords)

    meaningful = best_km_cand["silhouette_score"] >= 0.20 and best_km_cand["min_cluster_pct"] >= 2.0
    quality_verdict = (
        "MEANINGFUL_CLUSTERING"
        if meaningful
        else "WEAK_CLUSTER_SEPARATION"
    )
    limitations = [
        CLUSTERING_ETHICS_DISCLAIMER,
        "Data poin Sabat bersifat skewed (banyak mahasiswa bernilai 0 poin dan ekor kanan panjang), sehingga batas antar klaster bersifat gradasi kontinu.",
        f"Mahasiswa dengan periode observasi berbeda digabungkan menggunakan fitur ternormalisasi (persentil per periode & jumlah periode terobservasi); PCA 2D menjelaskan {sum(pca_explained):.1f}% varians.",
    ]

    full_pipeline = Pipeline(
        steps=[
            ("imputer", prep.named_steps["imputer"]),
            ("scaler", prep.named_steps["scaler"]),
            ("model", best_km_model),
        ]
    )

    cluster_label_lookup = {p["cluster_id"]: p["label"] for p in profiles}

    return {
        "status": "SUCCESS",
        "quality_verdict": quality_verdict,
        "recommended_algorithm": "KMeans",
        "recommended_k": best_k,
        "selection_reason": selection_reason,
        "ethics_disclaimer": CLUSTERING_ETHICS_DISCLAIMER,
        "n_students_clustered": n_samples,
        "features": list(CLUSTERING_FEATURE_COLS),
        "pca_explained_variance_pct": pca_explained,
        "metrics": {
            "silhouette_score": best_km_cand["silhouette_score"],
            "davies_bouldin_index": best_km_cand["davies_bouldin_index"],
            "calinski_harabasz_score": best_km_cand["calinski_harabasz_score"],
            "min_cluster_size": best_km_cand["min_cluster_size"],
            "min_cluster_pct": best_km_cand["min_cluster_pct"],
            "cluster_balance_ratio": best_km_cand["cluster_balance_ratio"],
        },
        "k_evaluation_curve": kmeans_candidates,
        "algorithm_comparison": comparison_algorithms,
        "cluster_profiles": profiles,
        "student_assignments": assignments,
        "limitations": limitations,
        "artifact_bundle": {
            "task": "CLUSTERING",
            "algorithm": "KMeans",
            "k": best_k,
            "features": list(CLUSTERING_FEATURE_COLS),
            "pipeline": full_pipeline,
            "pca": pca,
            "cluster_labels": cluster_label_lookup,
            "random_state": random_state,
        },
    }
