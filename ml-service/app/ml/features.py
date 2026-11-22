from collections import defaultdict
from datetime import date
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import pandas as pd


CLUSTERING_FEATURE_COLS = [
    "mean_points",
    "max_points",
    "min_points",
    "std_points",
    "latest_points",
    "mean_period_percentile",
    "max_period_percentile",
    "point_trend_slope",
    "avg_point_change",
    "observed_periods_count",
    "missing_periods_count",
    "freq_positive_periods",
    "freq_high_point_periods",
    "freq_point_increases",
]

SUPERVISED_FEATURE_COLS = [
    "current_points",
    "current_period_percentile",
    "current_points_to_period_mean",
    "current_is_zero",
    "prev_points",
    "has_prev_observation",
    "last_point_change",
    "historical_mean_points",
    "historical_max_points",
    "historical_min_points",
    "historical_std_points",
    "historical_mean_percentile",
    "historical_max_percentile",
    "historical_percentile_trend",
    "observed_periods_so_far",
    "missing_periods_so_far",
    "freq_positive_periods_so_far",
    "freq_high_point_periods_so_far",
    "freq_point_increases_so_far",
    "current_period_position_in_semester",
    "is_same_semester_transition",
    "days_to_next_period",
]


def _parse_iso(d: str) -> date:
    return date.fromisoformat(d[:10])


def _compute_period_statistics(resolved_records: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
    """
    Compute per-period summary statistics strictly within each reporting date T.
    Used to compute period-relative percentile & ratio features at time T without any future leakage.
    """
    by_date: Dict[str, List[int]] = defaultdict(list)
    for rec in resolved_records:
        if rec.get("identity_status") == "IDENTITY_UNCERTAIN":
            continue
        by_date[rec["reporting_date"]].append(int(rec["total_points"]))

    stats: Dict[str, Dict[str, Any]] = {}
    for rep_date, pts in by_date.items():
        arr = np.sort(np.array(pts, dtype=float))
        stats[rep_date] = {
            "sorted_points": arr,
            "count": len(arr),
            "mean": float(np.mean(arr)) if len(arr) else 1.0,
            "std": float(np.std(arr)) if len(arr) else 1.0,
            "median": float(np.median(arr)) if len(arr) else 0.0,
            "q75": float(np.percentile(arr, 75)) if len(arr) else 0.0,
            "max": float(np.max(arr)) if len(arr) else 1.0,
        }
    return stats


def _percentile_in_period(val: float, sorted_arr: np.ndarray) -> float:
    if len(sorted_arr) == 0:
        return 0.0
    if val <= 0:
        return 0.0
    rank = float(np.searchsorted(sorted_arr, val, side="right"))
    return round((rank / len(sorted_arr)) * 100.0, 2)


def _period_position_in_semester(periods_meta: List[Dict[str, Any]]) -> Dict[str, int]:
    """
    Determine chronological position of each reporting_date within its academic semester
    (1 = first/mid snapshot in semester, 2 = second/late snapshot in semester, etc.).
    """
    ordered = sorted(periods_meta, key=lambda p: p["reporting_date"])
    sem_counter: Dict[str, int] = defaultdict(int)
    pos_map: Dict[str, int] = {}
    for p in ordered:
        sem = p["academic_semester"]
        sem_counter[sem] += 1
        pos_map[p["reporting_date"]] = sem_counter[sem]
    return pos_map


def build_clustering_dataset(
    resolved_records: List[Dict[str, Any]],
    continuity_result: Dict[str, Any],
) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Build student-level numerical feature matrix for unsupervised clustering (Objective A).
    Excludes IDENTITY_UNCERTAIN entities. NEVER includes NIM, student_name, or IDs as features.
    Missing periods are NEVER imputed as 0 points — statistics are computed strictly over
    observed periods, while missing_periods_count explicitly captures observation completeness.
    """
    period_stats = _compute_period_statistics(resolved_records)
    rows: List[Dict[str, Any]] = []
    meta_rows: List[Dict[str, Any]] = []

    for stu in continuity_result["students"]:
        if not stu["clustering_eligible"]:
            continue

        obs_entries = [h for h in stu["presence_history"] if h["status"] == "PRESENT"]
        if not obs_entries:
            continue

        pts = [float(h["total_points"]) for h in obs_entries]
        pcts = [
            _percentile_in_period(
                float(h["total_points"]),
                period_stats[h["reporting_date"]]["sorted_points"],
            )
            for h in obs_entries
        ]
        high_flags = [
            1.0
            if float(h["total_points"]) > 0
            and float(h["total_points"]) >= period_stats[h["reporting_date"]]["q75"]
            else 0.0
            for h in obs_entries
        ]

        n_obs = len(pts)
        diffs = [pts[i] - pts[i - 1] for i in range(1, n_obs)]
        pct_diffs = [pcts[i] - pcts[i - 1] for i in range(1, n_obs)]

        if n_obs >= 2:
            x_idx = np.arange(n_obs, dtype=float)
            slope = float(np.polyfit(x_idx, np.array(pcts, dtype=float), 1)[0])
            avg_chg = float(np.mean(diffs))
            freq_inc = float(sum(1 for d in diffs if d > 0) / len(diffs))
        else:
            slope = 0.0
            avg_chg = 0.0
            freq_inc = 0.0

        feat = {
            "mean_points": round(float(np.mean(pts)), 3),
            "max_points": round(float(np.max(pts)), 3),
            "min_points": round(float(np.min(pts)), 3),
            "std_points": round(float(np.std(pts)), 3) if n_obs >= 2 else 0.0,
            "latest_points": round(pts[-1], 3),
            "mean_period_percentile": round(float(np.mean(pcts)), 3),
            "max_period_percentile": round(float(np.max(pcts)), 3),
            "point_trend_slope": round(slope, 3),
            "avg_point_change": round(avg_chg, 3),
            "observed_periods_count": float(n_obs),
            "missing_periods_count": float(stu["missing_periods_count"]),
            "freq_positive_periods": round(float(sum(1 for p in pts if p > 0) / n_obs), 3),
            "freq_high_point_periods": round(float(np.mean(high_flags)), 3),
            "freq_point_increases": round(freq_inc, 3),
        }
        rows.append(feat)
        meta_rows.append(
            {
                "internal_student_id": stu["internal_student_id"],
                "nim": stu["nim"],
                "student_name": stu["student_name"],
                "faculty": stu["faculty"],
                "study_program": stu["study_program"],
                "continuity_status": stu["continuity_status"],
                "total_observed_periods": stu["total_observed_periods"],
                "missing_periods_count": stu["missing_periods_count"],
                "observed_avg_points": stu["observed_avg_points"],
                "latest_observed_points": stu["latest_observed_points"],
            }
        )

    df = pd.DataFrame(rows, columns=CLUSTERING_FEATURE_COLS)
    return df, meta_rows


def _build_student_feature_vector_at_index(
    stu: Dict[str, Any],
    t_idx: int,
    ordered_periods: List[Dict[str, Any]],
    period_stats: Dict[str, Dict[str, Any]],
    pos_map: Dict[str, int],
    target_same_semester: int,
    days_to_next: float,
) -> Dict[str, Any]:
    """
    Construct a leakage-free feature vector strictly using observations at period indices <= t_idx.
    NO information from t_idx + 1 or later (except calendar schedule metadata known at prediction time).
    """
    history_up_to_t = stu["presence_history"][: t_idx + 1]
    obs_up_to_t = [h for h in history_up_to_t if h["status"] == "PRESENT"]
    missing_up_to_t = sum(1 for h in history_up_to_t if h["status"] == "ABSENT")

    curr_entry = history_up_to_t[-1]
    curr_date = curr_entry["reporting_date"]
    curr_pts = float(curr_entry["total_points"])
    pstat = period_stats[curr_date]

    curr_pct = _percentile_in_period(curr_pts, pstat["sorted_points"])
    curr_to_mean = round(curr_pts / max(1.0, pstat["mean"]), 4)
    curr_is_zero = 1.0 if curr_pts == 0.0 else 0.0

    obs_pts = [float(h["total_points"]) for h in obs_up_to_t]
    obs_pcts = [
        _percentile_in_period(
            float(h["total_points"]),
            period_stats[h["reporting_date"]]["sorted_points"],
        )
        for h in obs_up_to_t
    ]
    obs_high = [
        1.0
        if float(h["total_points"]) > 0
        and float(h["total_points"]) >= period_stats[h["reporting_date"]]["q75"]
        else 0.0
        for h in obs_up_to_t
    ]

    n_obs = len(obs_pts)
    if n_obs >= 2:
        prev_pts = obs_pts[-2]
        has_prev = 1.0
        last_chg = curr_pts - prev_pts
        diffs = [obs_pts[i] - obs_pts[i - 1] for i in range(1, n_obs)]
        freq_inc = float(sum(1 for d in diffs if d > 0) / len(diffs))
        pct_trend = float(np.polyfit(np.arange(n_obs, dtype=float), np.array(obs_pcts, dtype=float), 1)[0])
        hist_std = float(np.std(obs_pts))
    else:
        prev_pts = np.nan  # Preserved as NaN — imputed strictly on training fold!
        has_prev = 0.0
        last_chg = np.nan
        freq_inc = 0.0
        pct_trend = 0.0
        hist_std = 0.0

    return {
        "current_points": curr_pts,
        "current_period_percentile": curr_pct,
        "current_points_to_period_mean": curr_to_mean,
        "current_is_zero": curr_is_zero,
        "prev_points": prev_pts,
        "has_prev_observation": has_prev,
        "last_point_change": last_chg,
        "historical_mean_points": round(float(np.mean(obs_pts)), 3),
        "historical_max_points": round(float(np.max(obs_pts)), 3),
        "historical_min_points": round(float(np.min(obs_pts)), 3),
        "historical_std_points": round(hist_std, 3),
        "historical_mean_percentile": round(float(np.mean(obs_pcts)), 3),
        "historical_max_percentile": round(float(np.max(obs_pcts)), 3),
        "historical_percentile_trend": round(pct_trend, 3),
        "observed_periods_so_far": float(n_obs),
        "missing_periods_so_far": float(missing_up_to_t),
        "freq_positive_periods_so_far": round(float(sum(1 for p in obs_pts if p > 0) / n_obs), 3),
        "freq_high_point_periods_so_far": round(float(np.mean(obs_high)), 3),
        "freq_point_increases_so_far": round(freq_inc, 3),
        "current_period_position_in_semester": float(pos_map.get(curr_date, 1)),
        "is_same_semester_transition": float(target_same_semester),
        "days_to_next_period": float(days_to_next),
    }


def build_supervised_transition_dataset(
    resolved_records: List[Dict[str, Any]],
    continuity_result: Dict[str, Any],
) -> Tuple[pd.DataFrame, List[Dict[str, Any]]]:
    """
    Construct chronological supervised training/evaluation examples (Period T -> Period T+1).

    STRICT ANTI-LEAKAGE & CONTINUITY GUARANTEES:
    - Excludes IDENTITY_UNCERTAIN entities completely.
    - Generates a sample ONLY when the student is genuinely observed at BOTH period T AND period T+1.
    - Students who disappear permanently (no observation at T+1) NEVER generate an artificial 0 target.
    - Students who temporarily disappeared earlier and returned ARE included for every valid (T -> T+1) pair,
      with missing prior observations explicitly tracked (never imputed as 0).
    - Labels each sample's subgroup ('PREVIOUSLY_OBSERVED', 'NEWLY_OBSERVED_AT_T', 'INCOMPLETE_HISTORY_WITH_GAP')
      strictly based on observations <= T for transparent subgroup evaluation!
    """
    ordered_periods = sorted(continuity_result["periods"], key=lambda p: p["reporting_date"])
    period_stats = _compute_period_statistics(resolved_records)
    pos_map = _period_position_in_semester(ordered_periods)

    feature_rows: List[Dict[str, Any]] = []
    meta_rows: List[Dict[str, Any]] = []

    for t_idx in range(len(ordered_periods) - 1):
        p_curr = ordered_periods[t_idx]
        p_next = ordered_periods[t_idx + 1]
        same_sem = 1 if p_curr["academic_semester"] == p_next["academic_semester"] else 0
        days_gap = max(1, (_parse_iso(p_next["reporting_date"]) - _parse_iso(p_curr["reporting_date"])).days)
        transition_id = t_idx + 1
        transition_label = f"P{t_idx + 1}({p_curr['reporting_date']})->P{t_idx + 2}({p_next['reporting_date']})"

        for stu in continuity_result["students"]:
            if stu["continuity_status"] == "IDENTITY_UNCERTAIN":
                continue

            h_curr = stu["presence_history"][t_idx]
            h_next = stu["presence_history"][t_idx + 1]
            if h_curr["status"] != "PRESENT" or h_next["status"] != "PRESENT":
                continue

            feat = _build_student_feature_vector_at_index(
                stu=stu,
                t_idx=t_idx,
                ordered_periods=ordered_periods,
                period_stats=period_stats,
                pos_map=pos_map,
                target_same_semester=same_sem,
                days_to_next=float(days_gap),
            )

            # Determine honest history subgroup at prediction time T (strictly <= t_idx)
            prior_hist = stu["presence_history"][:t_idx]
            prior_present = sum(1 for h in prior_hist if h["status"] == "PRESENT")
            prior_absent = sum(1 for h in prior_hist if h["status"] == "ABSENT")
            if t_idx == 0:
                subgroup = "BASELINE_FIRST_PERIOD"
            elif prior_present == 0:
                subgroup = "NEWLY_OBSERVED_AT_T"
            elif prior_absent > 0:
                subgroup = "INCOMPLETE_HISTORY_WITH_GAP"
            else:
                subgroup = "PREVIOUSLY_OBSERVED_CONTINUOUS"

            target_pts = float(h_next["total_points"])

            feature_rows.append(feat)
            meta_rows.append(
                {
                    "transition_index": transition_id,
                    "transition_label": transition_label,
                    "source_reporting_date": p_curr["reporting_date"],
                    "target_reporting_date": p_next["reporting_date"],
                    "source_semester": p_curr["academic_semester"],
                    "target_semester": p_next["academic_semester"],
                    "is_same_semester_transition": bool(same_sem),
                    "internal_student_id": stu["internal_student_id"],
                    "nim": stu["nim"],
                    "continuity_status": stu["continuity_status"],
                    "history_subgroup": subgroup,
                    "current_points": float(h_curr["total_points"]),
                    "target_next_points": target_pts,
                }
            )

    df = pd.DataFrame(feature_rows, columns=SUPERVISED_FEATURE_COLS)
    return df, meta_rows


def build_inference_feature_row(
    stu: Dict[str, Any],
    resolved_records: List[Dict[str, Any]],
    periods_meta: List[Dict[str, Any]],
    next_is_same_semester: bool = False,
    expected_days_to_next: int = 120,
) -> Dict[str, Any]:
    """
    Build a single student's inference feature vector from their latest observed period
    to predict the upcoming (future) reporting period, using the exact same feature pipeline.
    """
    ordered_periods = sorted(periods_meta, key=lambda p: p["reporting_date"])
    period_stats = _compute_period_statistics(resolved_records)
    pos_map = _period_position_in_semester(ordered_periods)

    # Locate the student's latest PRESENT index
    present_indices = [i for i, h in enumerate(stu["presence_history"]) if h["status"] == "PRESENT"]
    if not present_indices:
        raise ValueError("Mahasiswa belum memiliki periode observasi yang valid untuk prediksi.")
    last_t = present_indices[-1]

    return _build_student_feature_vector_at_index(
        stu=stu,
        t_idx=last_t,
        ordered_periods=ordered_periods,
        period_stats=period_stats,
        pos_map=pos_map,
        target_same_semester=1 if next_is_same_semester else 0,
        days_to_next=float(expected_days_to_next),
    )
