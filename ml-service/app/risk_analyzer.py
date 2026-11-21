from datetime import date
from typing import Any, Dict, List, Optional
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler


def _parse_date(date_str: Optional[str]) -> Optional[date]:
    if not date_str:
        return None
    try:
        return date.fromisoformat(date_str[:10])
    except Exception:
        return None


def _compute_projection(
    current_points: int,
    history: List[Dict[str, Any]],
    report_date: Optional[date],
    semester_start: Optional[date],
    cutoff_date: Optional[date],
    attendance_closed: bool,
) -> float:
    if current_points <= 0:
        return 0.0
    if attendance_closed:
        return float(current_points)
    if report_date is None or cutoff_date is None or report_date >= cutoff_date:
        return float(current_points)

    days_remaining = (cutoff_date - report_date).days

    # Multi-period velocity projection if >= 2 dated snapshots exist
    valid_hist = []
    for h in history or []:
        hd = _parse_date(h.get("report_date"))
        hp = h.get("sabbath_points")
        if hd is not None and hp is not None:
            valid_hist.append((hd, int(hp)))
    valid_hist.sort(key=lambda x: x[0])

    if len(valid_hist) >= 2:
        prev_date, prev_pts = valid_hist[-2]
        curr_date, curr_pts = valid_hist[-1]
        span_days = max(1, (curr_date - prev_date).days)
        delta = max(0, curr_pts - prev_pts)
        daily_rate = delta / span_days
        # Realistic damping factor (0.85) so projections don't over-extrapolate spikes
        projected = curr_pts + (daily_rate * days_remaining * 0.85)
        return round(min(projected, curr_pts * 2.5 + 40), 1)

    # Single-period proportional projection based on semester timeline
    if semester_start is not None and report_date > semester_start:
        elapsed_days = max(14, (report_date - semester_start).days)
        total_days = max(elapsed_days, (cutoff_date - semester_start).days)
        ratio = min(2.0, total_days / elapsed_days)
        projected = current_points * ratio
        return round(projected, 1)

    return float(current_points)


def analyze_student_risks(payload: Dict[str, Any]) -> Dict[str, Any]:
    students: List[Dict[str, Any]] = payload.get("students", [])
    report_date = _parse_date(payload.get("report_date"))
    semester_start = _parse_date(payload.get("semester_start_date"))
    cutoff_date = _parse_date(payload.get("attendance_cutoff_date"))
    final_point_limit: Optional[int] = payload.get("final_point_limit")
    attendance_closed: bool = bool(payload.get("attendance_closed", False))

    if not students:
        return {
            "model_name": "DynamicKMeansRiskAnalyzer",
            "model_version": "2.0",
            "analysis_mode": "EMPTY",
            "cluster_ranges": {},
            "summary": {
                "total": 0,
                "safe_count": 0,
                "low_count": 0,
                "medium_count": 0,
                "high_count": 0,
                "exceeds_final_limit_count": 0,
            },
            "results": [],
        }

    all_points = [max(0, int(s.get("sabbath_points", 0))) for s in students]
    sorted_all = sorted(all_points)
    n_total = len(all_points)

    has_multi_period = any(len(s.get("history") or []) >= 2 for s in students)
    analysis_mode = "MULTI_PERIOD_KMEANS_PROJECTION" if has_multi_period else "DYNAMIC_KMEANS_CLUSTERING"

    positive_indices = [i for i, pts in enumerate(all_points) if pts > 0]
    positive_points = [all_points[i] for i in positive_indices]
    distinct_positive = sorted(set(positive_points))

    # Build feature matrix & cluster positive-point students dynamically (no fixed cutoff!)
    pos_labels: Dict[int, str] = {}
    pos_probs: Dict[int, Dict[str, float]] = {}
    cluster_ranges: Dict[str, Dict[str, int]] = {
        "SAFE": {"min": 0, "max": 0},
    }

    if len(distinct_positive) >= 3:
        feature_rows = []
        for idx in positive_indices:
            pts = all_points[idx]
            delta = max(0, int(students[idx].get("points_delta", 0) or 0))
            if has_multi_period:
                feature_rows.append([float(pts), float(delta)])
            else:
                feature_rows.append([float(pts)])

        X_raw = np.array(feature_rows, dtype=float)
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X_raw)

        kmeans = KMeans(n_clusters=3, random_state=42, n_init=10)
        raw_clusters = kmeans.fit_predict(X_scaled)

        # Rank clusters deterministically by mean sabbath_points ascending -> LOW, MEDIUM, HIGH
        cluster_means = []
        for c in range(3):
            c_pts = [X_raw[j, 0] for j in range(len(positive_indices)) if raw_clusters[j] == c]
            cluster_means.append((c, float(np.mean(c_pts)) if c_pts else 0.0))
        cluster_means.sort(key=lambda item: item[1])

        cluster_to_risk = {
            cluster_means[0][0]: "LOW",
            cluster_means[1][0]: "MEDIUM",
            cluster_means[2][0]: "HIGH",
        }
        ordered_centroids = np.array([kmeans.cluster_centers_[c] for c, _ in cluster_means])

        # Compute soft probabilities from distances to ordered centroids
        for j, orig_idx in enumerate(positive_indices):
            assigned_risk = cluster_to_risk[raw_clusters[j]]
            pos_labels[orig_idx] = assigned_risk

            dists = np.linalg.norm(ordered_centroids - X_scaled[j], axis=1)
            # Softmax over negative distances with temperature 0.65
            logits = -dists / 0.65
            logits -= np.max(logits)
            exp_scores = np.exp(logits)
            probs = exp_scores / np.sum(exp_scores)

            pos_probs[orig_idx] = {
                "LOW": round(float(probs[0]), 4),
                "MEDIUM": round(float(probs[1]), 4),
                "HIGH": round(float(probs[2]), 4),
            }

        for risk_name in ("LOW", "MEDIUM", "HIGH"):
            pts_in_risk = [all_points[i] for i in positive_indices if pos_labels[i] == risk_name]
            if pts_in_risk:
                cluster_ranges[risk_name] = {"min": int(min(pts_in_risk)), "max": int(max(pts_in_risk))}
    else:
        # Fallback when fewer than 3 distinct positive values exist
        max_pos = max(positive_points) if positive_points else 1
        for orig_idx in positive_indices:
            pts = all_points[orig_idx]
            ratio = pts / max_pos
            if ratio >= 0.7:
                pos_labels[orig_idx] = "HIGH"
                pos_probs[orig_idx] = {"LOW": 0.08, "MEDIUM": 0.22, "HIGH": 0.70}
            elif ratio >= 0.35:
                pos_labels[orig_idx] = "MEDIUM"
                pos_probs[orig_idx] = {"LOW": 0.18, "MEDIUM": 0.64, "HIGH": 0.18}
            else:
                pos_labels[orig_idx] = "LOW"
                pos_probs[orig_idx] = {"LOW": 0.75, "MEDIUM": 0.20, "HIGH": 0.05}

        for risk_name in ("LOW", "MEDIUM", "HIGH"):
            pts_in_risk = [all_points[i] for i in positive_indices if pos_labels[i] == risk_name]
            if pts_in_risk:
                cluster_ranges[risk_name] = {"min": int(min(pts_in_risk)), "max": int(max(pts_in_risk))}

    results = []
    counts = {"SAFE": 0, "LOW": 0, "MEDIUM": 0, "HIGH": 0}
    exceeds_final_count = 0

    for idx, s in enumerate(students):
        pts = all_points[idx]
        delta = int(s.get("points_delta", 0) or 0)
        history = s.get("history") or []

        # Percentile rank within the current cohort (higher = worse violation standing)
        less_or_equal = sum(1 for v in sorted_all if v <= pts)
        percentile = round((less_or_equal / n_total) * 100.0, 1) if pts > 0 else 0.0

        projected = _compute_projection(
            current_points=pts,
            history=history,
            report_date=report_date,
            semester_start=semester_start,
            cutoff_date=cutoff_date,
            attendance_closed=attendance_closed,
        )

        if pts == 0:
            risk = "SAFE"
            probs = {"LOW": 0.96, "MEDIUM": 0.03, "HIGH": 0.01}
        else:
            risk = pos_labels[idx]
            probs = pos_probs[idx]

        exceeds_limit = final_point_limit is not None and pts >= final_point_limit
        if exceeds_limit:
            exceeds_final_count += 1

        counts[risk] += 1
        results.append({
            "student_id": s.get("student_id"),
            "nim": s.get("nim"),
            "current_points": pts,
            "points_delta": delta,
            "risk_category": risk,
            "probabilities": probs,
            "projected_end_points": projected,
            "percentile_rank": percentile,
            "exceeds_final_limit": exceeds_limit,
        })

    return {
        "model_name": "DynamicKMeansRiskAnalyzer",
        "model_version": "2.0",
        "analysis_mode": analysis_mode,
        "cluster_ranges": cluster_ranges,
        "summary": {
            "total": n_total,
            "safe_count": counts["SAFE"],
            "low_count": counts["LOW"],
            "medium_count": counts["MEDIUM"],
            "high_count": counts["HIGH"],
            "exceeds_final_limit_count": exceeds_final_count,
        },
        "results": results,
    }
