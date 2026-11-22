import hashlib
import json
import re
import zipfile
import xml.etree.ElementTree as ET
from datetime import date, datetime
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from app.config import EXTRACTION_CACHE_DIR, ensure_artifact_dirs
from app.pdf_parser import (
    _clean_cell,
    _clean_nim_cell,
    _detect_column_map,
    _infer_default_prodi_from_faculty,
    _is_header_row,
    _normalize_name,
    _parse_int,
    _parse_table_row,
    normalize_faculty_name,
    parse_points_pdf,
)


def parse_folder_date(folder_name: str) -> Optional[date]:
    """Parse reporting date from folder names like DD-MM-YYYY or YYYY-MM-DD."""
    name = folder_name.strip()
    for fmt in ("%d-%m-%Y", "%Y-%m-%d", "%d_%m_%Y", "%Y_%m_%d", "%d.%m.%Y"):
        try:
            return datetime.strptime(name, fmt).date()
        except ValueError:
            continue
    return None


def infer_academic_semester(filename: str, report_date: date) -> Tuple[str, str]:
    """
    Infer academic semester label (e.g., '2025/2026 SEM 1') and human period label
    from filename or reporting date.
    Returns (semester_key, reporting_period_label).
    """
    upper = filename.upper()
    m = re.search(r"SEM\s*(\d)\s*(\d{4})\s*[-/]\s*(\d{4})", upper)
    if m:
        sem_num, y1, y2 = m.group(1), m.group(2), m.group(3)
        sem_key = f"{y1}-{y2}_SEM{sem_num}"
        return sem_key, f"Sem {sem_num} {y1}/{y2} ({report_date.isoformat()})"

    if "AGUS-NOV 2025" in upper or "AGUSTUS" in upper:
        return "2025-2026_SEM1", f"Sem 1 2025/2026 ({report_date.isoformat()})"

    # Fallback by calendar month (Aug-Dec = Sem 1 of Y/(Y+1), Jan-Jul = Sem 2 of (Y-1)/Y)
    if report_date.month >= 8:
        y1, y2 = report_date.year, report_date.year + 1
        return f"{y1}-{y2}_SEM1", f"Sem 1 {y1}/{y2} ({report_date.isoformat()})"
    else:
        y1, y2 = report_date.year - 1, report_date.year
        return f"{y1}-{y2}_SEM2", f"Sem 2 {y1}/{y2} ({report_date.isoformat()})"


def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def parse_points_xlsx(file_bytes: bytes, filename: str) -> Dict[str, Any]:
    """
    Read-only native .xlsx extractor using Python stdlib (zipfile + XML).
    Handles sparse cells, offset columns (e.g. Column B start in Pertanian),
    header variations (NO REGIS, STUDENT_REG_NUMBER), missing NIMs, and footer NOTE rows.
    """
    import io

    warnings: List[str] = []
    detected_faculty = normalize_faculty_name(filename)
    default_prodi = _infer_default_prodi_from_faculty(detected_faculty)
    records: List[Dict[str, Any]] = []
    seen_nims: Dict[str, int] = {}
    duplicate_count = 0
    invalid_row_count = 0
    missing_nim_count = 0
    footer_notes: List[str] = []

    with zipfile.ZipFile(io.BytesIO(file_bytes), "r") as z:
        names = z.namelist()
        ns = {"a": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
        shared_strings: List[str] = []
        if "xl/sharedStrings.xml" in names:
            root = ET.fromstring(z.read("xl/sharedStrings.xml"))
            for si in root.findall("a:si", ns):
                shared_strings.append("".join(t.text or "" for t in si.findall(".//a:t", ns)))

        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rel_map = {el.attrib["Id"]: el.attrib["Target"] for el in rels}

        sheets = wb.findall(".//a:sheet", ns)
        if not sheets:
            raise ValueError("File Excel (.xlsx) tidak memiliki worksheet.")

        for sheet in sheets:
            rid = sheet.attrib["{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"]
            target = rel_map[rid]
            if not target.startswith("xl/"):
                target = "xl/" + target.lstrip("/")
            if target not in names:
                continue

            sroot = ET.fromstring(z.read(target))
            col_map: Optional[Dict[str, int]] = None

            for r_idx, row_el in enumerate(sroot.findall(".//a:sheetData/a:row", ns), start=1):
                row_dict: Dict[int, str] = {}
                max_col = -1
                for c in row_el.findall("a:c", ns):
                    ref = c.attrib.get("r", "")
                    col_letters = re.sub(r"\d+", "", ref)
                    col_idx = 0
                    for ch in col_letters:
                        col_idx = col_idx * 26 + (ord(ch.upper()) - ord("A") + 1)
                    col_idx -= 1
                    if col_idx < 0:
                        continue
                    if col_idx > max_col:
                        max_col = col_idx
                    t = c.attrib.get("t")
                    v_el = c.find("a:v", ns)
                    is_el = c.find("a:is", ns)
                    val = ""
                    if t == "s" and v_el is not None and v_el.text is not None:
                        s_i = int(v_el.text)
                        val = shared_strings[s_i] if 0 <= s_i < len(shared_strings) else ""
                    elif t == "inlineStr" and is_el is not None:
                        val = "".join(x.text or "" for x in is_el.findall(".//a:t", ns))
                    elif v_el is not None and v_el.text is not None:
                        val = v_el.text
                    row_dict[col_idx] = _clean_cell(val)

                if max_col < 0:
                    continue
                cells = [row_dict.get(i, "") for i in range(max_col + 1)]
                if not any(cells):
                    continue

                # Check footer note rows
                joined_upper = " ".join(c for c in cells if c).upper()
                if joined_upper.startswith("NOTE :") or joined_upper.startswith("NOTE:"):
                    footer_notes.append(" ".join(c for c in cells if c))
                    continue

                detected_map = _detect_column_map(cells)
                if detected_map:
                    col_map = detected_map
                    continue
                if _is_header_row(cells):
                    continue

                rec = _parse_table_row(cells, col_map=col_map, default_prodi=default_prodi)
                if rec is None:
                    # Try relaxed check when missing NIM or non-numeric points
                    non_empty = [c for c in cells if c]
                    if len(non_empty) >= 2:
                        invalid_row_count += 1
                        warnings.append(f"Baris Excel {r_idx}: gagal dibaca ({' | '.join(non_empty[:4])}).")
                    continue

                if rec["sabbath_points"] < 0:
                    invalid_row_count += 1
                    warnings.append(f"Baris Excel {r_idx}: nilai poin negatif ({rec['sabbath_points']}) pada NIM {rec['nim']}.")
                    rec["sabbath_points"] = 0

                if not rec["nim"]:
                    missing_nim_count += 1
                    warnings.append(
                        f"Baris Excel {r_idx}: NIM kosong untuk '{rec['full_name']}' (poin={rec['sabbath_points']}); "
                        "akan dicocokkan secara hati-hati dengan nama."
                    )
                    records.append(rec)
                else:
                    nim = rec["nim"]
                    if nim in seen_nims:
                        duplicate_count += 1
                        warnings.append(f"NIM duplikat dalam file ({nim}); baris terakhir digunakan.")
                        records[seen_nims[nim]] = rec
                    else:
                        seen_nims[nim] = len(records)
                        records.append(rec)

    if not records:
        raise ValueError("Tidak ada baris data mahasiswa yang valid ditemukan pada file Excel (.xlsx).")

    for idx, rec in enumerate(records, start=1):
        if rec["row_number"] is None:
            rec["row_number"] = idx

    points_list = [r["sabbath_points"] for r in records]
    sorted_pts = sorted(points_list)
    n = len(points_list)
    median_pts = (
        float(sorted_pts[n // 2])
        if n % 2 == 1
        else round((sorted_pts[n // 2 - 1] + sorted_pts[n // 2]) / 2.0, 1)
    )

    return {
        "file_name": filename,
        "detected_faculty": detected_faculty,
        "total_pages": len(sheets),
        "total_rows": n,
        "zero_point_count": sum(1 for p in points_list if p == 0),
        "with_point_count": sum(1 for p in points_list if p > 0),
        "max_points": max(points_list),
        "avg_points": round(sum(points_list) / n, 1),
        "median_points": median_pts,
        "duplicate_count": duplicate_count,
        "invalid_row_count": invalid_row_count,
        "missing_nim_count": missing_nim_count,
        "pages_without_text": 0,
        "footer_notes": footer_notes,
        "warnings": warnings[:50],
        "records": records,
    }


def _extract_single_file(
    file_path: Path,
    root_dir: Path,
    report_date: date,
    use_cache: bool = True,
) -> Tuple[List[Dict[str, Any]], Dict[str, Any]]:
    """
    Extract records from a single PDF or XLSX file (read-only), with SHA-256 caching.
    Returns (normalized_records, file_processing_report).
    """
    ensure_artifact_dirs()
    rel_path = str(file_path.relative_to(root_dir)).replace("\\", "/")
    ext = file_path.suffix.lower()
    file_sha256 = compute_sha256(file_path)
    cache_file = EXTRACTION_CACHE_DIR / f"{file_sha256}.json"
    semester_key, period_label = infer_academic_semester(file_path.name, report_date)

    cache_hit = False
    parsed: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    extraction_status = "SUCCESS"

    if use_cache and cache_file.exists():
        try:
            cached = json.loads(cache_file.read_text(encoding="utf-8"))
            if cached.get("parser_version") == "v2.1" and cached.get("sha256") == file_sha256:
                parsed = cached["parsed"]
                cache_hit = True
        except Exception:
            parsed = None

    if parsed is None:
        try:
            raw_bytes = file_path.read_bytes()
            if not raw_bytes:
                raise ValueError("File kosong (0 bytes).")
            if ext == ".pdf":
                parsed = parse_points_pdf(raw_bytes, filename=file_path.name)
            elif ext == ".xlsx":
                parsed = parse_points_xlsx(raw_bytes, filename=file_path.name)
            else:
                raise ValueError(f"Format file tidak didukung: {ext}")

            if use_cache:
                cache_file.write_text(
                    json.dumps(
                        {
                            "parser_version": "v2.1",
                            "sha256": file_sha256,
                            "file_name": file_path.name,
                            "parsed": parsed,
                        },
                        ensure_ascii=False,
                    ),
                    encoding="utf-8",
                )
        except Exception as exc:
            error_message = str(exc)
            extraction_status = "FAILED" if "kosong" not in error_message.lower() else "EMPTY"
            parsed = None

    if parsed is None:
        return [], {
            "file_name": file_path.name,
            "relative_path": rel_path,
            "file_type": ext.lstrip("."),
            "file_sha256": file_sha256,
            "file_size_bytes": file_path.stat().st_size,
            "reporting_date": report_date.isoformat(),
            "academic_semester": semester_key,
            "reporting_period": period_label,
            "detected_faculty": normalize_faculty_name(file_path.name),
            "extracted_records": 0,
            "extraction_status": extraction_status,
            "cache_hit": False,
            "duplicate_records": 0,
            "invalid_records": 0,
            "missing_values": 0,
            "warnings": [error_message] if error_message else [],
            "error": error_message,
        }

    faculty = normalize_faculty_name(parsed.get("detected_faculty") or file_path.name)
    raw_records = parsed.get("records", [])
    dup_count = int(parsed.get("duplicate_count", 0))
    inv_count = int(parsed.get("invalid_row_count", 0))
    missing_nim = int(parsed.get("missing_nim_count", 0))
    missing_prodi = sum(1 for r in raw_records if not r.get("study_program") or r.get("study_program") == "Umum")
    warnings = list(parsed.get("warnings", []))

    if inv_count > 0 or missing_nim > 0:
        extraction_status = "SUCCESS_WITH_WARNINGS"

    normalized_records: List[Dict[str, Any]] = []
    for r in raw_records:
        normalized_records.append(
            {
                "raw_nim": (r.get("nim") or "").strip().upper(),
                "first_name": r.get("first_name", ""),
                "last_name": r.get("last_name", ""),
                "student_name": r.get("full_name", "Tanpa Nama"),
                "faculty": faculty,
                "study_program": r.get("study_program") or _infer_default_prodi_from_faculty(faculty),
                "reporting_date": report_date.isoformat(),
                "academic_semester": semester_key,
                "reporting_period": period_label,
                "total_points": int(r.get("sabbath_points", 0)),
                "point_category_breakdown": None,  # Source PDFs contain aggregate Poin Sabat only
                "row_number": r.get("row_number"),
                "source_file": rel_path,
                "source_file_type": ext.lstrip("."),
                "source_sha256": file_sha256,
                "extraction_status": "MISSING_NIM" if not (r.get("nim") or "").strip() else "VALID",
            }
        )

    file_report = {
        "file_name": file_path.name,
        "relative_path": rel_path,
        "file_type": ext.lstrip("."),
        "file_sha256": file_sha256,
        "file_size_bytes": file_path.stat().st_size,
        "reporting_date": report_date.isoformat(),
        "academic_semester": semester_key,
        "reporting_period": period_label,
        "detected_faculty": faculty,
        "total_pages": parsed.get("total_pages", 1),
        "extracted_records": len(normalized_records),
        "zero_point_records": int(parsed.get("zero_point_count", 0)),
        "positive_point_records": int(parsed.get("with_point_count", 0)),
        "max_points": int(parsed.get("max_points", 0)),
        "avg_points": float(parsed.get("avg_points", 0.0)),
        "extraction_status": extraction_status,
        "cache_hit": cache_hit,
        "duplicate_records": dup_count,
        "invalid_records": inv_count,
        "missing_values": missing_nim,
        "missing_prodi_count": missing_prodi,
        "warnings": warnings,
        "error": None,
    }
    return normalized_records, file_report


def scan_and_extract_directory(
    root_dir: Path,
    use_cache: bool = True,
    previous_manifest: Optional[Dict[str, str]] = None,
) -> Dict[str, Any]:
    """
    Recursively scan historical data directory (strictly read-only),
    parse folder dates chronologically, extract all PDF and XLSX reports,
    and detect new/changed/unchanged files relative to previous_manifest.
    """
    if not root_dir.exists() or not root_dir.is_dir():
        return {
            "status": "FAILED",
            "error": f"Direktori sumber data historis tidak ditemukan: {root_dir}",
            "root_dir": str(root_dir),
            "folders_scanned": 0,
            "files_discovered": 0,
            "periods": [],
            "file_reports": [],
            "records": [],
            "change_detection": {"new_files": [], "modified_files": [], "unchanged_files": [], "removed_files": []},
        }

    dated_folders: List[Tuple[date, Path]] = []
    skipped_folders: List[str] = []

    for entry in sorted(root_dir.iterdir()):
        if not entry.is_dir():
            continue
        parsed_date = parse_folder_date(entry.name)
        if parsed_date is None:
            skipped_folders.append(entry.name)
            continue
        dated_folders.append((parsed_date, entry))

    dated_folders.sort(key=lambda x: x[0])

    if not dated_folders:
        return {
            "status": "EMPTY",
            "error": f"Tidak ada folder bertanggal (DD-MM-YYYY) ditemukan di {root_dir}.",
            "root_dir": str(root_dir),
            "folders_scanned": 0,
            "files_discovered": 0,
            "skipped_folders": skipped_folders,
            "periods": [],
            "file_reports": [],
            "records": [],
            "change_detection": {"new_files": [], "modified_files": [], "unchanged_files": [], "removed_files": []},
        }

    all_records: List[Dict[str, Any]] = []
    file_reports: List[Dict[str, Any]] = []
    current_manifest: Dict[str, str] = {}
    periods_meta: List[Dict[str, Any]] = []

    for period_idx, (rep_date, folder_path) in enumerate(dated_folders, start=1):
        supported_files = sorted(
            f for f in folder_path.rglob("*")
            if f.is_file() and f.suffix.lower() in {".pdf", ".xlsx"}
        )
        period_records_count = 0
        period_semesters = set()
        period_faculties = set()
        period_failed = 0

        for fpath in supported_files:
            recs, frep = _extract_single_file(fpath, root_dir, rep_date, use_cache=use_cache)
            file_reports.append(frep)
            current_manifest[frep["relative_path"]] = frep["file_sha256"]
            period_semesters.add(frep["academic_semester"])
            period_faculties.add(frep["detected_faculty"])
            if frep["extraction_status"] in {"FAILED", "EMPTY"}:
                period_failed += 1
            for r in recs:
                r["period_index"] = period_idx
            all_records.extend(recs)
            period_records_count += len(recs)

        sem_key = sorted(period_semesters)[0] if period_semesters else f"{rep_date.year}_SEM"
        periods_meta.append(
            {
                "period_index": period_idx,
                "folder_name": folder_path.name,
                "reporting_date": rep_date.isoformat(),
                "academic_semester": sem_key,
                "period_label": f"{sem_key.replace('_', ' ')} ({rep_date.isoformat()})",
                "files_count": len(supported_files),
                "failed_files_count": period_failed,
                "faculties_covered": sorted(period_faculties),
                "records_extracted": period_records_count,
            }
        )

    prev = previous_manifest or {}
    new_files = sorted(k for k in current_manifest if k not in prev)
    modified_files = sorted(k for k in current_manifest if k in prev and current_manifest[k] != prev[k])
    unchanged_files = sorted(k for k in current_manifest if k in prev and current_manifest[k] == prev[k])
    removed_files = sorted(k for k in prev if k not in current_manifest)

    # Deterministic dataset version hash over all source file hashes + reporting dates
    manifest_fingerprint = hashlib.sha256(
        json.dumps(sorted(current_manifest.items()), ensure_ascii=False).encode("utf-8")
    ).hexdigest()[:12]

    successful_files = sum(1 for r in file_reports if r["extraction_status"].startswith("SUCCESS"))
    failed_files = len(file_reports) - successful_files

    return {
        "status": "SUCCESS" if all_records else "EMPTY",
        "root_dir": str(root_dir),
        "dataset_fingerprint": manifest_fingerprint,
        "processed_at": datetime.now().isoformat(),
        "folders_scanned": len(dated_folders),
        "skipped_folders": skipped_folders,
        "files_discovered": len(file_reports),
        "files_succeeded": successful_files,
        "files_failed": failed_files,
        "pdf_files_count": sum(1 for r in file_reports if r["file_type"] == "pdf"),
        "xlsx_files_count": sum(1 for r in file_reports if r["file_type"] == "xlsx"),
        "total_records_extracted": len(all_records),
        "periods": periods_meta,
        "file_manifest": current_manifest,
        "change_detection": {
            "new_files": new_files,
            "modified_files": modified_files,
            "unchanged_files": unchanged_files,
            "removed_files": removed_files,
        },
        "file_reports": file_reports,
        "records": all_records,
    }
