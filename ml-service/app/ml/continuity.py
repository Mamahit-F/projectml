from collections import defaultdict
from typing import Any, Dict, List, Optional


CONTINUITY_CATEGORIES = (
    "CONTINUOUSLY_OBSERVED",
    "TEMPORARY_GAP_RETURNED",
    "NEWLY_OBSERVED",
    "INTERMITTENT_OBSERVATION",
    "INACTIVE_OR_GRADUATED_UNCONFIRMED",
    "INSUFFICIENT_HISTORY",
    "IDENTITY_UNCERTAIN",
)


def analyze_student_continuity(
    resolved_records: List[Dict[str, Any]],
    periods_meta: List[Dict[str, Any]],
) -> Dict[str, Any]:
    """
    Analyze chronological presence/absence of every student across all available reporting periods.

    CRITICAL RULES:
    - A missing observation is NEVER interpreted as 0 points (represented as null / Absent).
    - Disappearance in trailing period(s) is classified as INACTIVE_OR_GRADUATED_UNCONFIRMED
      and NEVER claimed as confirmed graduation.
    - Temporary disappearance followed by return is classified as TEMPORARY_GAP_RETURNED
      (or INTERMITTENT_OBSERVATION if multiple disappearance/return cycles occur).
    - Newly appearing students (absent initially, present through latest period) are NEWLY_OBSERVED.
    - Students with uncertain identity (NIM-name conflict / unresolved missing NIM) are
      classified as IDENTITY_UNCERTAIN and excluded from supervised training & clustering until reviewed.
    - Clearly separates clustering_eligible vs prediction_eligible with explicit exclusion reasons.
    """
    ordered_periods = sorted(periods_meta, key=lambda p: p["reporting_date"])
    period_dates = [p["reporting_date"] for p in ordered_periods]
    n_periods = len(period_dates)

    # Group observations by internal_student_id
    by_student: Dict[str, Dict[str, Dict[str, Any]]] = defaultdict(dict)
    student_meta: Dict[str, Dict[str, Any]] = {}

    for rec in resolved_records:
        sid = rec["internal_student_id"]
        rdate = rec["reporting_date"]
        by_student[sid][rdate] = rec

        if sid not in student_meta:
            student_meta[sid] = {
                "internal_student_id": sid,
                "nim": rec.get("resolved_nim"),
                "student_name": rec.get("canonical_student_name", rec.get("student_name", "Tanpa Nama")),
                "faculty": rec.get("faculty", "Universitas Klabat"),
                "study_program": rec.get("study_program", "Umum"),
                "identity_status": rec.get("identity_status", "VERIFIED_BY_NIM"),
                "identity_warning": rec.get("identity_warning"),
            }
        else:
            # Prefer non-Umum study program and latest observed metadata
            if student_meta[sid]["study_program"] == "Umum" and rec.get("study_program") not in {None, "", "Umum"}:
                student_meta[sid]["study_program"] = rec["study_program"]
            if rec.get("identity_status") == "IDENTITY_UNCERTAIN":
                student_meta[sid]["identity_status"] = "IDENTITY_UNCERTAIN"
                student_meta[sid]["identity_warning"] = rec.get("identity_warning")

    student_summaries: List[Dict[str, Any]] = []
    category_counts: Dict[str, int] = {cat: 0 for cat in CONTINUITY_CATEGORIES}

    for sid, obs_map in sorted(by_student.items()):
        meta = student_meta[sid]
        presence_vector: List[bool] = [d in obs_map for d in period_dates]
        presence_history: List[Dict[str, Any]] = []
        observed_dates: List[str] = []
        missing_dates: List[str] = []
        observed_points: List[int] = []

        for p_info, is_present in zip(ordered_periods, presence_vector):
            rdate = p_info["reporting_date"]
            if is_present:
                rec = obs_map[rdate]
                pts = int(rec["total_points"])
                observed_dates.append(rdate)
                observed_points.append(pts)
                presence_history.append(
                    {
                        "period_index": p_info["period_index"],
                        "reporting_date": rdate,
                        "academic_semester": p_info["academic_semester"],
                        "status": "PRESENT",
                        "total_points": pts,  # Real observed value (may legitimately be 0)
                    }
                )
            else:
                missing_dates.append(rdate)
                presence_history.append(
                    {
                        "period_index": p_info["period_index"],
                        "reporting_date": rdate,
                        "academic_semester": p_info["academic_semester"],
                        "status": "ABSENT",
                        "total_points": None,  # NEVER 0 when absent!
                    }
                )

        total_observed = len(observed_dates)
        first_idx = presence_vector.index(True)
        last_idx = n_periods - 1 - presence_vector[::-1].index(True)

        # Compute max consecutive observed periods, disappearance events (P->A), and return events (A->P)
        max_consecutive = 0
        curr_consecutive = 0
        disappearance_events = 0
        return_events = 0
        valid_consecutive_transitions = 0

        for i, present in enumerate(presence_vector):
            if present:
                curr_consecutive += 1
                if curr_consecutive > max_consecutive:
                    max_consecutive = curr_consecutive
            else:
                curr_consecutive = 0
            if i > 0:
                prev = presence_vector[i - 1]
                if prev and not present:
                    disappearance_events += 1
                elif not prev and present:
                    # Only count return if student had ALREADY been observed before index i
                    if any(presence_vector[:i]):
                        return_events += 1
                if prev and present:
                    valid_consecutive_transitions += 1

        # Count all forward observed pairs (t -> next chronological period t+1 where both exist)
        # Note: supervised prediction targets the genuinely subsequent reporting period (period_idx -> period_idx + 1)
        supervised_transitions_count = valid_consecutive_transitions

        # Algorithmic classification into the 7 continuity categories
        identity_uncertain = meta["identity_status"] == "IDENTITY_UNCERTAIN"
        trailing_absent = last_idx < (n_periods - 1)
        leading_absent = first_idx > 0
        has_internal_gap = any(not presence_vector[i] for i in range(first_idx, last_idx + 1))

        if identity_uncertain:
            continuity_status = "IDENTITY_UNCERTAIN"
        elif n_periods >= 2 and total_observed == n_periods:
            continuity_status = "CONTINUOUSLY_OBSERVED"
        elif return_events >= 2:
            continuity_status = "INTERMITTENT_OBSERVATION"
        elif trailing_absent and not has_internal_gap:
            # Observed earlier, then absent for all subsequent reporting periods
            if total_observed == 1 and first_idx > 0 and last_idx < n_periods - 1:
                continuity_status = "INSUFFICIENT_HISTORY"
            else:
                continuity_status = "INACTIVE_OR_GRADUATED_UNCONFIRMED"
        elif trailing_absent and has_internal_gap:
            # Had gap(s) and also disappeared at the end
            if return_events >= 1:
                continuity_status = "INTERMITTENT_OBSERVATION"
            else:
                continuity_status = "INACTIVE_OR_GRADUATED_UNCONFIRMED"
        elif has_internal_gap and return_events == 1:
            # Disappeared temporarily and returned (and currently present in latest period)
            continuity_status = "TEMPORARY_GAP_RETURNED"
        elif leading_absent and not trailing_absent and not has_internal_gap:
            # Absent initially, appeared later and remained present through the latest period
            continuity_status = "NEWLY_OBSERVED"
        elif total_observed < 2:
            continuity_status = "INSUFFICIENT_HISTORY"
        else:
            continuity_status = "INTERMITTENT_OBSERVATION"

        category_counts[continuity_status] += 1

        # Determine analytical (clustering) eligibility vs supervised future prediction eligibility
        exclusion_reasons: List[str] = []

        if identity_uncertain:
            clustering_eligible = False
            prediction_training_eligible = False
            future_inference_eligible = False
            exclusion_reasons.append("Identitas belum pasti (konflik NIM-Nama atau NIM kosong); perlu tinjauan manual.")
        else:
            # Clustering uses observed historical point profiles (any verified student with >=1 observed period)
            clustering_eligible = total_observed >= 1

            # Supervised training eligibility: must have >= 1 valid chronological (t -> t+1) observed transition
            prediction_training_eligible = supervised_transitions_count >= 1
            if not prediction_training_eligible:
                if total_observed < 2:
                    exclusion_reasons.append("Riwayat hanya 1 periode observasi; belum memiliki pasangan transisi (T -> T+1) untuk pelatihan supervised.")
                else:
                    exclusion_reasons.append("Tidak memiliki dua periode berurutan (T dan T+1) yang sama-sama terobservasi.")

            # Future inference eligibility (predicting period N+1):
            # Students who disappeared permanently from latest period(s) (INACTIVE_OR_GRADUATED_UNCONFIRMED)
            # are NOT automatically eligible for active next-period inference!
            if trailing_absent:
                future_inference_eligible = False
                exclusion_reasons.append(
                    "Tidak terobservasi pada periode laporan terbaru (INACTIVE_OR_GRADUATED_UNCONFIRMED); "
                    "tetap tersimpan dalam riwayat tetapi tidak otomatis diprediksi untuk periode mendatang."
                )
            else:
                future_inference_eligible = total_observed >= 1

        # Historical observed point stats (strictly over observed periods; never imputes absent as 0)
        avg_pts = round(sum(observed_points) / total_observed, 2) if total_observed else None
        max_pts = max(observed_points) if observed_points else None
        min_pts = min(observed_points) if observed_points else None
        latest_obs_pts = observed_points[-1] if observed_points else None
        # Point change between last two observed periods (if >= 2)
        last_obs_change = (
            observed_points[-1] - observed_points[-2] if total_observed >= 2 else None
        )

        student_summaries.append(
            {
                "internal_student_id": sid,
                "nim": meta["nim"],
                "student_name": meta["student_name"],
                "faculty": meta["faculty"],
                "study_program": meta["study_program"],
                "identity_status": meta["identity_status"],
                "identity_warning": meta["identity_warning"],
                "total_reporting_periods_available": n_periods,
                "first_observed_date": observed_dates[0],
                "last_observed_date": observed_dates[-1],
                "total_observed_periods": total_observed,
                "missing_periods_count": len(missing_dates),
                "missing_periods": missing_dates,
                "max_consecutive_observed_periods": max_consecutive,
                "disappearance_events": disappearance_events,
                "return_events": return_events,
                "valid_supervised_transitions": supervised_transitions_count,
                "presence_pattern": "".join("P" if p else "A" for p in presence_vector),
                "presence_history": presence_history,
                "continuity_status": continuity_status,
                "clustering_eligible": clustering_eligible,
                "prediction_eligible": prediction_training_eligible,
                "future_inference_eligible": future_inference_eligible,
                "exclusion_reason": " ".join(exclusion_reasons) if exclusion_reasons else None,
                "observed_avg_points": avg_pts,
                "observed_max_points": max_pts,
                "observed_min_points": min_pts,
                "latest_observed_points": latest_obs_pts,
                "last_observed_change": last_obs_change,
            }
        )

    clustering_eligible_count = sum(1 for s in student_summaries if s["clustering_eligible"])
    prediction_eligible_count = sum(1 for s in student_summaries if s["prediction_eligible"])
    future_inference_eligible_count = sum(1 for s in student_summaries if s["future_inference_eligible"])
    incomplete_history_count = sum(
        1 for s in student_summaries if s["missing_periods_count"] > 0 and s["continuity_status"] != "IDENTITY_UNCERTAIN"
    )

    return {
        "periods": ordered_periods,
        "summary": {
            "total_reporting_periods": n_periods,
            "total_unique_students": len(student_summaries),
            "continuously_observed": category_counts["CONTINUOUSLY_OBSERVED"],
            "temporary_gap_returned": category_counts["TEMPORARY_GAP_RETURNED"],
            "newly_observed": category_counts["NEWLY_OBSERVED"],
            "intermittent_observation": category_counts["INTERMITTENT_OBSERVATION"],
            "inactive_or_graduated_unconfirmed": category_counts["INACTIVE_OR_GRADUATED_UNCONFIRMED"],
            "insufficient_history": category_counts["INSUFFICIENT_HISTORY"],
            "identity_uncertain": category_counts["IDENTITY_UNCERTAIN"],
            "incomplete_history_students": incomplete_history_count,
            "clustering_eligible_students": clustering_eligible_count,
            "prediction_training_eligible_students": prediction_eligible_count,
            "future_inference_eligible_students": future_inference_eligible_count,
            "category_breakdown": category_counts,
            "notes": (
                "Ketidakhadiran mahasiswa dalam suatu periode laporan diperlakukan sebagai data hilang (missing), "
                "BUKAN 0 poin. Status INACTIVE_OR_GRADUATED_UNCONFIRMED menandakan mahasiswa tidak muncul pada "
                "periode terbaru dan BUKAN konfirmasi kelulusan resmi."
            ),
        },
        "students": student_summaries,
    }
