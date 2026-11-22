from collections import Counter, defaultdict
from typing import Any, Dict, List
import numpy as np


def run_data_quality_audit(
    extraction_result: Dict[str, Any],
    identity_result: Dict[str, Any],
    continuity_result: Dict[str, Any],
) -> Dict[str, Any]:
    """
    Perform a comprehensive data quality audit across extracted files, resolved identities,
    chronological ordering, missingness, duplicates, and point outliers.
    Distinguishes legitimate high-point observations from potential extraction anomalies.
    """
    records = identity_result["records"]
    file_reports = extraction_result.get("file_reports", [])
    periods = extraction_result.get("periods", [])

    # 1. File-level & extraction quality checks
    failed_files = [f for f in file_reports if f["extraction_status"] in {"FAILED", "EMPTY"}]
    warning_files = [f for f in file_reports if f["extraction_status"] == "SUCCESS_WITH_WARNINGS"]
    within_file_duplicates = sum(int(f.get("duplicate_records", 0)) for f in file_reports)
    invalid_rows_total = sum(int(f.get("invalid_records", 0)) for f in file_reports)
    missing_nim_total = sum(int(f.get("missing_values", 0)) for f in file_reports)

    # 2. Reporting date ordering & duplicate reporting date check
    dates_ordered = [p["reporting_date"] for p in periods]
    is_strictly_chronological = all(dates_ordered[i] < dates_ordered[i + 1] for i in range(len(dates_ordered) - 1))
    duplicate_reporting_dates = [d for d, cnt in Counter(dates_ordered).items() if cnt > 1]

    # 3. Faculty coverage consistency across periods
    all_faculties = sorted({fac for p in periods for fac in p.get("faculties_covered", [])})
    faculty_coverage_gaps: List[Dict[str, Any]] = []
    for p in periods:
        missing_facs = [fac for fac in all_faculties if fac not in p.get("faculties_covered", [])]
        if missing_facs:
            faculty_coverage_gaps.append(
                {
                    "reporting_date": p["reporting_date"],
                    "missing_faculties": missing_facs,
                }
            )

    # 4. Point value validation & per-period distribution + outlier diagnosis
    negative_points = [r for r in records if r["total_points"] < 0]
    missing_points = [r for r in records if r.get("total_points") is None]
    missing_prodi_records = sum(1 for r in records if not r.get("study_program") or r["study_program"] == "Umum")

    by_period: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
    for r in records:
        by_period[r["reporting_date"]].append(r)

    period_distributions: List[Dict[str, Any]] = []
    outliers_report: List[Dict[str, Any]] = []

    for rep_date in dates_ordered:
        precs = by_period.get(rep_date, [])
        if not precs:
            continue
        pts = np.array([r["total_points"] for r in precs], dtype=float)
        q1, median, q3 = np.percentile(pts, [25, 50, 75])
        p95, p99 = np.percentile(pts, [95, 99])
        iqr = float(q3 - q1)
        upper_fence = float(q3 + 1.5 * iqr)
        extreme_fence = float(q3 + 3.0 * iqr)
        mean_val = float(np.mean(pts))
        std_val = float(np.std(pts))

        iqr_outliers = [r for r in precs if r["total_points"] > upper_fence]
        extreme_outliers = [r for r in precs if r["total_points"] > extreme_fence]

        period_distributions.append(
            {
                "reporting_date": rep_date,
                "record_count": len(precs),
                "zero_point_count": int(np.sum(pts == 0)),
                "zero_point_pct": round(float(np.mean(pts == 0) * 100.0), 1),
                "min": int(np.min(pts)),
                "q1": round(float(q1), 1),
                "median": round(float(median), 1),
                "mean": round(mean_val, 2),
                "std": round(std_val, 2),
                "q3": round(float(q3), 1),
                "p95": round(float(p95), 1),
                "p99": round(float(p99), 1),
                "max": int(np.max(pts)),
                "iqr_upper_fence": round(upper_fence, 1),
                "iqr_outlier_count": len(iqr_outliers),
                "extreme_outlier_count": len(extreme_outliers),
            }
        )

        # Classify top outliers per period: valid high-point student vs potential data/extraction anomaly
        for r in sorted(iqr_outliers, key=lambda x: -x["total_points"])[:10]:
            val = r["total_points"]
            z = round((val - mean_val) / std_val, 2) if std_val > 0 else 0.0
            # Sabbath points in a semester realistically reach ~200-260; values > 400 would suggest extraction error
            if val > 400:
                assessment = "POTENTIAL_EXTRACTION_OR_ENTRY_ERROR"
                rationale = "Nilai jauh melampaui rentang wajar akumulasi poin Sabat satu semester (>400)."
            elif val > extreme_fence:
                assessment = "ABNORMAL_BUT_PLAUSIBLE_HIGH_POINT_OBSERVATION"
                rationale = "Melebihi batas ekstrem 3x IQR namun masih dalam skala akumulasi poin Sabat semester; dipertahankan."
            else:
                assessment = "VALID_HIGH_POINT_STUDENT"
                rationale = "Outlier statistik (>1.5x IQR) yang valid secara domain (akumulasi ketidakhadiran tinggi); tidak dihapus."

            outliers_report.append(
                {
                    "reporting_date": rep_date,
                    "internal_student_id": r["internal_student_id"],
                    "nim": r.get("resolved_nim"),
                    "faculty": r.get("faculty"),
                    "total_points": val,
                    "z_score": z,
                    "assessment": assessment,
                    "rationale": rationale,
                }
            )

    # 5. Unexpected within-semester point decreases (excused/adjusted points)
    student_by_sem: Dict[tuple, List[Dict[str, Any]]] = defaultdict(list)
    for r in records:
        if r["identity_status"] != "IDENTITY_UNCERTAIN":
            student_by_sem[(r["internal_student_id"], r["academic_semester"])].append(r)

    same_sem_decreases = 0
    same_sem_pairs = 0
    for _, items in student_by_sem.items():
        if len(items) < 2:
            continue
        items.sort(key=lambda x: x["reporting_date"])
        for i in range(1, len(items)):
            same_sem_pairs += 1
            if items[i]["total_points"] < items[i - 1]["total_points"]:
                same_sem_decreases += 1

    # 6. Overall Data Quality Status & Actionable Warnings
    issues: List[Dict[str, Any]] = []
    if failed_files:
        issues.append(
            {
                "severity": "ERROR",
                "code": "FAILED_FILE_EXTRACTIONS",
                "count": len(failed_files),
                "message": f"{len(failed_files)} file gagal diekstrak.",
            }
        )
    if identity_result["summary"]["nim_name_conflicts_count"] > 0:
        issues.append(
            {
                "severity": "WARNING",
                "code": "NIM_NAME_CONFLICTS",
                "count": identity_result["summary"]["nim_name_conflicts_count"],
                "message": (
                    f"Terdeteksi {identity_result['summary']['nim_name_conflicts_count']} rekaman konflik NIM-Nama "
                    "(terindikasi pergeseran urutan kolom pada laporan sumber, khususnya Filsafat/FILKOM 06-11-2026). "
                    "Rekaman tersebut dikarantina sebagai IDENTITY_UNCERTAIN dan TIDAK digabungkan secara diam-diam."
                ),
            }
        )
    if missing_nim_total > 0:
        issues.append(
            {
                "severity": "WARNING",
                "code": "MISSING_NIM",
                "count": missing_nim_total,
                "message": f"{missing_nim_total} baris tidak memiliki NIM; ditangani secara hati-hati dengan pencocokan nama eksak atau ditandai IDENTITY_UNCERTAIN.",
            }
        )
    if identity_result["summary"]["ambiguous_same_name_groups_count"] > 0:
        issues.append(
            {
                "severity": "INFO",
                "code": "SAME_NAME_DIFFERENT_NIM",
                "count": identity_result["summary"]["ambiguous_same_name_groups_count"],
                "message": f"{identity_result['summary']['ambiguous_same_name_groups_count']} nama identik tercatat pada lebih dari satu NIM (tidak digabung otomatis).",
            }
        )
    if identity_result["summary"]["within_period_duplicates_count"] > 0 or within_file_duplicates > 0:
        issues.append(
            {
                "severity": "INFO",
                "code": "DUPLICATE_RECORDS",
                "count": within_file_duplicates + identity_result["summary"]["within_period_duplicates_count"],
                "message": (
                    f"Duplikat dalam file: {within_file_duplicates}, duplikat dalam periode yang sama: "
                    f"{identity_result['summary']['within_period_duplicates_count']} (telah dideduplikasi)."
                ),
            }
        )
    if same_sem_decreases > 0:
        issues.append(
            {
                "severity": "INFO",
                "code": "WITHIN_SEMESTER_POINT_ADJUSTMENTS",
                "count": same_sem_decreases,
                "message": (
                    f"Dari {same_sem_pairs} transisi dalam semester yang sama, terdapat {same_sem_decreases} penurunan poin "
                    "(kemungkinan dispensasi/koreksi administratif poin Sabat)."
                ),
            }
        )
    if missing_prodi_records > 0:
        issues.append(
            {
                "severity": "INFO",
                "code": "MISSING_PRODI_COLUMN_IN_EARLIER_REPORTS",
                "count": missing_prodi_records,
                "message": (
                    f"{missing_prodi_records} rekaman belum memiliki prodi spesifik karena laporan awal 5-kolom "
                    "tidak menyertakan kolom PRODI (telah diisi balik dari periode lain jika tersedia)."
                ),
            }
        )

    if failed_files or negative_points or missing_points or not is_strictly_chronological:
        overall_status = "ATTENTION_REQUIRED"
    elif identity_result["summary"]["nim_name_conflicts_count"] > 0 or warning_files:
        overall_status = "VALID_WITH_WARNINGS"
    else:
        overall_status = "HEALTHY"

    return {
        "overall_status": overall_status,
        "chronological_order_valid": is_strictly_chronological,
        "duplicate_reporting_dates": duplicate_reporting_dates,
        "files_total": len(file_reports),
        "files_failed": len(failed_files),
        "files_with_warnings": len(warning_files),
        "within_file_duplicates": within_file_duplicates,
        "within_period_duplicates": identity_result["summary"]["within_period_duplicates_count"],
        "invalid_rows_skipped": invalid_rows_total,
        "negative_point_records": len(negative_points),
        "missing_point_records": len(missing_points),
        "missing_nim_records": missing_nim_total,
        "missing_prodi_records": missing_prodi_records,
        "nim_name_conflicts_count": identity_result["summary"]["nim_name_conflicts_count"],
        "ambiguous_same_name_groups_count": identity_result["summary"]["ambiguous_same_name_groups_count"],
        "same_semester_point_decreases": same_sem_decreases,
        "same_semester_pairs_checked": same_sem_pairs,
        "faculty_coverage_gaps": faculty_coverage_gaps,
        "period_distributions": period_distributions,
        "outliers_sample": outliers_report[:30],
        "issues": issues,
        "nim_conflicts_sample": identity_result.get("nim_conflicts", [])[:40],
        "missing_nim_resolutions": identity_result.get("missing_nim_resolutions", []),
        "ambiguous_name_groups": identity_result.get("ambiguous_name_groups", [])[:30],
    }
