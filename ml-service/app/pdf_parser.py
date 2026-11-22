import io
import re
from typing import Any, Dict, List, Optional, Tuple
import pdfplumber

HEADER_KEYWORDS = {
    "no",
    "no regis",
    "student reg",
    "student reg number",
    "student_reg_number",
    "reg number",
    "nim",
    "last name",
    "last_name",
    "first name",
    "first_name",
    "prodi",
    "program studi",
    "poin",
    "poin sabat",
}

KNOWN_PRODI_PATTERNS = [
    ("Sistem Informasi", "Sistem Informasi"),
    ("Teknologi Informasi", "Teknologi Informasi"),
    ("Informatika", "Informatika"),
    ("Akuntansi", "Akuntansi"),
    ("Manajemen", "Manajemen"),
    ("Sekretari D3", "Sekretari D3"),
    ("Sekretari", "Sekretari D3"),
    ("Ilmu Keperawatan", "Ilmu Keperawatan"),
    ("Keperawatan", "Ilmu Keperawatan"),
    ("Profesi Ners", "Profesi Ners"),
    ("Pendidikan Bahasa Inggris", "Bahasa Inggris"),
    ("Bahasa Inggris", "Bahasa Inggris"),
    ("Pend. Agama Kristen", "Pend. Agama Kristen"),
    ("Pendidikan Agama Kristen", "Pend. Agama Kristen"),
    ("Pendidikan Agama", "Pend. Agama Kristen"),
    ("Pend. Ekonomi", "Pend. Ekonomi"),
    ("Pendidikan Ekonomi", "Pend. Ekonomi"),
    ("Ilmu Filsafat", "Ilmu Filsafat"),
    ("Filsafat", "Ilmu Filsafat"),
    ("Arsitektur", "Arsitektur"),
    ("Arsitek", "Arsitektur"),
    ("Agroteknologi", "Agroteknologi"),
    ("Pertanian", "Agroteknologi"),
]

FACULTY_CANONICAL_MAP = [
    ("ILMU KOMPUTER", "Fakultas Ilmu Komputer"),
    ("FILKOM", "Fakultas Ilmu Komputer"),
    ("EKONOMI DAN BISNIS", "Fakultas Ekonomi dan Bisnis"),
    ("FEKON", "Fakultas Ekonomi dan Bisnis"),
    ("EKONOMI", "Fakultas Ekonomi dan Bisnis"),
    ("KEPERAWATAN", "Fakultas Keperawatan"),
    ("FKEP", "Fakultas Keperawatan"),
    ("KEGURUAN DAN ILMU PENDIDIKAN", "Fakultas Keguruan dan Ilmu Pendidikan"),
    ("FKIP", "Fakultas Keguruan dan Ilmu Pendidikan"),
    ("FILSAFAT", "Fakultas Filsafat"),
    ("ARSITEK", "Fakultas Arsitektur"),
    ("TEKNIK", "Fakultas Arsitektur"),  # 09-03-2026 Arsitek report was titled Fakultas Teknik
    ("PERTANIAN", "Fakultas Pertanian"),
]


def _clean_cell(val: Optional[str]) -> str:
    if val is None:
        return ""
    return re.sub(r"\s+", " ", str(val)).strip()


def normalize_faculty_name(raw_name: str) -> str:
    upper = _clean_cell(raw_name).upper()
    for needle, canonical in FACULTY_CANONICAL_MAP:
        if needle in upper:
            return canonical
    return _clean_cell(raw_name) or "Universitas Klabat"


def _is_header_row(cells: List[str]) -> bool:
    joined = " ".join(c.lower() for c in cells if c)
    if not joined:
        return True
    matches = sum(1 for kw in HEADER_KEYWORDS if kw in joined)
    return matches >= 2


def _detect_column_map(cells: List[str]) -> Optional[Dict[str, int]]:
    """Detect column indices dynamically from header cells."""
    lowered = [_clean_cell(c).lower().replace("_", " ") for c in cells]
    col_map: Dict[str, int] = {}
    for idx, c in enumerate(lowered):
        if not c:
            continue
        if c == "no" or c == "no.":
            col_map.setdefault("no", idx)
        elif "reg" in c or "nim" in c or "student" in c:
            col_map.setdefault("nim", idx)
        elif "last" in c:
            col_map.setdefault("last_name", idx)
        elif "first" in c:
            col_map.setdefault("first_name", idx)
        elif "prodi" in c or "program" in c:
            col_map.setdefault("prodi", idx)
        elif "poin" in c or "point" in c:
            col_map.setdefault("points", idx)
    if "nim" in col_map and "points" in col_map:
        return col_map
    return None


def _normalize_name(first_name: str, last_name: str) -> Tuple[str, str, str]:
    clean_first = _clean_cell(first_name)
    clean_last = _clean_cell(last_name)

    if clean_last in {"-", "--", "—", "n/a", "N/A", "null"}:
        clean_last = ""
    if clean_first in {"-", "--", "—", "n/a", "N/A", "null"}:
        clean_first = ""

    if clean_first and clean_last:
        full_name = f"{clean_first} {clean_last}"
    elif clean_first:
        full_name = clean_first
    elif clean_last:
        full_name = clean_last
    else:
        full_name = "Tanpa Nama"

    return clean_first, clean_last, full_name


def _parse_int(val: str) -> Optional[int]:
    cleaned = _clean_cell(val).replace(",", "")
    if re.fullmatch(r"-?\d+(\.0+)?", cleaned):
        return int(float(cleaned))
    if re.fullmatch(r"\d+", cleaned.replace(".", "")):
        return int(cleaned.replace(".", ""))
    return None


def _detect_faculty(first_page_text: str, filename: str = "") -> str:
    if first_page_text:
        for line in first_page_text.splitlines():
            line_clean = _clean_cell(line)
            if not line_clean:
                continue
            upper = line_clean.upper()
            if upper.startswith("FAKULTAS") or "FACULTY" in upper:
                return normalize_faculty_name(line_clean)
    if filename:
        norm = normalize_faculty_name(filename)
        if norm != _clean_cell(filename):
            return norm
    return "Universitas Klabat"


def _collapse_spaced_letters(text: str) -> str:
    """Fix wide-tracked PDF text like 'I l m u K e p e r a w a t a n'."""
    tokens = text.split()
    if len(tokens) >= 6 and sum(1 for t in tokens if len(t) == 1) / len(tokens) >= 0.7:
        joined = "".join(tokens)
        # Re-insert standard space for IlmuKeperawatan etc.
        for pattern, canonical in KNOWN_PRODI_PATTERNS:
            if joined.lower() == pattern.replace(" ", "").lower():
                return canonical
        return joined
    return text


def _extract_subsequence_leftover(text: str, pattern: str) -> Optional[str]:
    """
    If `pattern` appears as an ordered subsequence inside `text` (caused by Excel->PDF
    first_name text overflowing horizontally into the prodi column, e.g.
    'suIlmmau Keperawatan' = 'suma' + 'Ilmu Keperawatan', or
    'faiAthgroteknologi' = 'faith' + 'Agroteknologi'),
    return the leftover spilled characters if they form a plausible short name suffix.
    """
    t_low = text.lower()
    p_low = pattern.lower()
    if len(text) <= len(pattern) or len(text) - len(pattern) > 15:
        return None
    # Match pattern characters from right-to-left (suffix alignment preserves rightmost prodi words)
    pi = len(p_low) - 1
    used = [False] * len(text)
    for ti in range(len(t_low) - 1, -1, -1):
        if pi >= 0 and t_low[ti] == p_low[pi]:
            used[ti] = True
            pi -= 1
    if pi >= 0:
        return None
    leftover = "".join(ch for i, ch in enumerate(text) if not used[i]).strip()
    if leftover and re.fullmatch(r"[A-Za-z.\-'\s]{1,14}", leftover):
        return leftover
    return None


def _normalize_prodi_and_first_name(first_name: str, prodi: str) -> Tuple[str, str]:
    clean_first = _clean_cell(first_name)
    clean_prodi = _collapse_spaced_letters(_clean_cell(prodi))
    if not clean_prodi:
        return clean_first, "Umum"

    lower_p = clean_prodi.lower()
    # Sort patterns longest-first so 'Ilmu Keperawatan' is always checked before 'Keperawatan'
    ordered_patterns = sorted(KNOWN_PRODI_PATTERNS, key=lambda kv: -len(kv[0]))

    # 1. Exact match
    for pattern, canonical in ordered_patterns:
        if lower_p == pattern.lower():
            return clean_first, canonical

    # 2. Clean suffix match (e.g., 'u Informatika', 'zart Informatika')
    for pattern, canonical in ordered_patterns:
        lower_pat = pattern.lower()
        if lower_p.endswith(lower_pat):
            prefix = clean_prodi[: len(clean_prodi) - len(pattern)].strip()
            # Ensure prefix doesn't actually contain interleaved letters from a longer pattern (like 'suIlmmau')
            longer_subseq_hit = any(
                len(lp) > len(pattern) and _extract_subsequence_leftover(clean_prodi, lp) is not None
                for lp, _ in ordered_patterns
            )
            if not longer_subseq_hit and prefix and re.fullmatch(r"[A-Za-z.\-']{1,12}", prefix):
                clean_first = f"{clean_first}{prefix}" if clean_first else prefix
                return clean_first, canonical

    # 3. Interleaved character spill match (e.g., 'suIlmmau Keperawatan', 'faiAthgroteknologi')
    for pattern, canonical in ordered_patterns:
        leftover = _extract_subsequence_leftover(clean_prodi, pattern)
        if leftover is not None:
            clean_first = f"{clean_first}{leftover}" if clean_first else leftover
            return clean_first, canonical

    return clean_first, clean_prodi


def _clean_nim_cell(raw_nim: str) -> str:
    cleaned = _clean_cell(raw_nim)
    # Fix header bleed in 09-03-2026 FKIP where row 1 cell is 'NUMBER\nS22219008'
    cleaned = re.sub(r"^NUMBER\s+", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^NO\s*REGIS\s+", "", cleaned, flags=re.IGNORECASE)
    return cleaned.replace(" ", "").upper()


def _parse_table_row(
    row: List[Optional[str]],
    col_map: Optional[Dict[str, int]] = None,
    default_prodi: str = "Umum",
) -> Optional[Dict[str, Any]]:
    cells = [_clean_cell(c) for c in row]
    if not any(cells) or _is_header_row(cells):
        return None
    # Skip footer NOTE rows
    if any(c.upper().startswith("NOTE :") or c.upper().startswith("NOTE:") for c in cells):
        return None

    # 1. Use explicit header column map when detected (prevents 5-col LAST/FIRST misparsed as PRODI!)
    if col_map:
        def _get(key: str) -> str:
            idx = col_map.get(key)
            if idx is None or idx >= len(cells):
                return ""
            return cells[idx]

        row_num = _parse_int(_get("no")) if "no" in col_map else None
        nim = _clean_nim_cell(_get("nim"))
        last_name = _get("last_name")
        first_name = _get("first_name")
        prodi_raw = _get("prodi") if "prodi" in col_map else ""
        points = _parse_int(_get("points"))

        if points is not None and (
            (nim and re.match(r"^[A-Za-z0-9\-]{5,20}$", nim))
            or (not nim and (first_name or last_name))
        ):
            if prodi_raw:
                fixed_first, fixed_prodi = _normalize_prodi_and_first_name(first_name, prodi_raw)
            else:
                fixed_first, fixed_prodi = _clean_cell(first_name), default_prodi
            c_first, c_last, full_name = _normalize_name(fixed_first, last_name)
            return {
                "row_number": row_num,
                "nim": nim,
                "last_name": c_last,
                "first_name": c_first,
                "full_name": full_name,
                "study_program": fixed_prodi,
                "sabbath_points": points,
            }
        return None

    # 2. Fallback heuristic when header was not captured on current page
    # 6 columns: [NO, STUDENT REG NUMBER, LAST NAME, FIRST NAME, PRODI, POIN SABAT]
    if len(cells) >= 6:
        row_num = _parse_int(cells[0])
        nim = _clean_nim_cell(cells[1])
        last_name = cells[2]
        first_name = cells[3]
        prodi = cells[4]
        points = _parse_int(cells[5])

        if nim and points is not None and re.match(r"^[A-Za-z0-9\-]{5,20}$", nim):
            fixed_first, fixed_prodi = _normalize_prodi_and_first_name(first_name, prodi)
            c_first, c_last, full_name = _normalize_name(fixed_first, last_name)
            return {
                "row_number": row_num,
                "nim": nim,
                "last_name": c_last,
                "first_name": c_first,
                "full_name": full_name,
                "study_program": fixed_prodi,
                "sabbath_points": points,
            }

    # 5 columns: distinguish [NO, NIM, LAST, FIRST, POIN] vs [NO, NIM, FULL, PRODI, POIN]
    if len(cells) == 5:
        maybe_num = _parse_int(cells[0])
        nim_c1 = _clean_nim_cell(cells[1])
        points = _parse_int(cells[4])
        if maybe_num is not None and points is not None and re.match(r"^[A-Za-z0-9\-]{5,20}$", nim_c1):
            # Check if col 3 matches a known prodi pattern; otherwise treat as [NO, NIM, LAST, FIRST, POIN]
            col3_clean = _collapse_spaced_letters(cells[3]).lower()
            is_prodi_col = any(
                col3_clean == p.lower() or col3_clean.endswith(p.lower())
                for p, _ in KNOWN_PRODI_PATTERNS
            )
            if is_prodi_col:
                fixed_full, fixed_prodi = _normalize_prodi_and_first_name(cells[2], cells[3])
                full = _clean_cell(fixed_full)
                parts = full.split()
                c_first = " ".join(parts[:-1]) if len(parts) > 1 else full
                c_last = parts[-1] if len(parts) > 1 else ""
                return {
                    "row_number": maybe_num,
                    "nim": nim_c1,
                    "last_name": c_last,
                    "first_name": c_first,
                    "full_name": full or "Tanpa Nama",
                    "study_program": fixed_prodi,
                    "sabbath_points": points,
                }
            else:
                c_first, c_last, full_name = _normalize_name(cells[3], cells[2])
                return {
                    "row_number": maybe_num,
                    "nim": nim_c1,
                    "last_name": c_last,
                    "first_name": c_first,
                    "full_name": full_name,
                    "study_program": default_prodi,
                    "sabbath_points": points,
                }

        nim_c0 = _clean_nim_cell(cells[0])
        if points is not None and re.match(r"^[A-Za-z0-9\-]{5,20}$", nim_c0):
            fixed_first, fixed_prodi = _normalize_prodi_and_first_name(cells[2], cells[3])
            c_first, c_last, full_name = _normalize_name(fixed_first, cells[1])
            return {
                "row_number": None,
                "nim": nim_c0,
                "last_name": c_last,
                "first_name": c_first,
                "full_name": full_name,
                "study_program": fixed_prodi,
                "sabbath_points": points,
            }

    return None


def _parse_text_lines_fallback(page_text: str) -> List[Dict[str, Any]]:
    records: List[Dict[str, Any]] = []
    if not page_text:
        return records

    lines = [_clean_cell(l) for l in page_text.splitlines() if _clean_cell(l)]
    i = 0
    while i < len(lines):
        line = lines[i]
        if i + 1 < len(lines) and re.fullmatch(r"\d{1,4}", lines[i + 1]):
            candidate = f"{line} {lines[i + 1]}"
            matched = _match_line_record(candidate)
            if matched:
                records.append(matched)
                i += 2
                continue

        matched = _match_line_record(line)
        if matched:
            records.append(matched)
        i += 1
    return records


def _match_line_record(line: str) -> Optional[Dict[str, Any]]:
    m = re.match(r"^(\d{1,5})\s+([A-Za-z]?\d{6,14})\s+(.+?)\s+(\d{1,4})$", line)
    if not m:
        return None
    row_num = int(m.group(1))
    nim = m.group(2).upper()
    middle = m.group(3).strip()
    points = int(m.group(4))

    prodi = "Umum"
    name_part = middle
    for pattern, canonical in KNOWN_PRODI_PATTERNS:
        if middle.lower().endswith(pattern.lower()):
            prodi = canonical
            name_part = middle[: len(middle) - len(pattern)].strip()
            break

    name_part = re.sub(r"^-\s+", "", name_part).strip()
    tokens = name_part.split()
    if len(tokens) >= 2:
        last_name = tokens[0]
        first_name = " ".join(tokens[1:])
        c_first, c_last, full_name = _normalize_name(first_name, last_name)
    else:
        c_first, c_last, full_name = _normalize_name(name_part, "")

    return {
        "row_number": row_num,
        "nim": nim,
        "last_name": c_last,
        "first_name": c_first,
        "full_name": full_name,
        "study_program": prodi,
        "sabbath_points": max(0, points),
    }


def _infer_default_prodi_from_faculty(faculty: str) -> str:
    f = faculty.lower()
    if "arsitek" in f:
        return "Arsitektur"
    if "filsafat" in f:
        return "Ilmu Filsafat"
    if "keperawatan" in f:
        return "Ilmu Keperawatan"
    if "pertanian" in f:
        return "Agroteknologi"
    return "Umum"


def parse_points_pdf(file_bytes: bytes, filename: str = "report.pdf") -> Dict[str, Any]:
    warnings: List[str] = []
    parsed_by_nim: Dict[str, Dict[str, Any]] = {}
    ordered_keys: List[str] = []
    detected_faculty = "Universitas Klabat"
    total_pages = 0
    duplicate_count = 0
    invalid_row_count = 0
    missing_nim_count = 0
    pages_without_text = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        total_pages = len(pdf.pages)
        if total_pages == 0:
            raise ValueError("Dokumen PDF kosong atau tidak memiliki halaman.")

        first_text = pdf.pages[0].extract_text() or ""
        detected_faculty = _detect_faculty(first_text, filename=filename)
        default_prodi = _infer_default_prodi_from_faculty(detected_faculty)
        active_col_map: Optional[Dict[str, int]] = None

        for page_idx, page in enumerate(pdf.pages, start=1):
            page_records: List[Dict[str, Any]] = []
            text = page.extract_text() or ""
            if not text.strip():
                pages_without_text += 1

            tables = page.extract_tables() or []
            for table in tables:
                for row in table:
                    if not row:
                        continue
                    cleaned_cells = [_clean_cell(c) for c in row]
                    if not any(cleaned_cells):
                        continue
                    detected_map = _detect_column_map(cleaned_cells)
                    if detected_map:
                        active_col_map = detected_map
                        continue
                    if _is_header_row(cleaned_cells):
                        continue
                    # Skip title banner row (only col 0 filled)
                    non_empty = [c for c in cleaned_cells if c]
                    if len(non_empty) == 1:
                        continue
                    rec = _parse_table_row(row, col_map=active_col_map, default_prodi=default_prodi)
                    if rec:
                        if rec["sabbath_points"] < 0:
                            invalid_row_count += 1
                            warnings.append(f"Halaman {page_idx}: nilai poin negatif ({rec['sabbath_points']}) pada NIM {rec['nim']}.")
                        rec["sabbath_points"] = max(0, rec["sabbath_points"])
                        page_records.append(rec)
                    else:
                        if any(re.match(r"^\d+$", c) for c in cleaned_cells[:1]):
                            invalid_row_count += 1
                            warnings.append(f"Halaman {page_idx}: baris tidak valid dilewati ({' | '.join(cleaned_cells[:4])}).")

            if not page_records:
                page_records = _parse_text_lines_fallback(text)

            if not page_records:
                warnings.append(f"Halaman {page_idx}: tidak ditemukan baris data mahasiswa yang valid.")

            for idx_in_page, rec in enumerate(page_records):
                nim = rec["nim"]
                if not nim:
                    missing_nim_count += 1
                    key = f"__MISSING_NIM_{page_idx}_{idx_in_page}_{rec['full_name']}"
                else:
                    key = nim

                if key in parsed_by_nim:
                    duplicate_count += 1
                    warnings.append(f"NIM duplikat terdeteksi ({nim}); menggunakan data terakhir.")
                    parsed_by_nim[key] = rec
                else:
                    parsed_by_nim[key] = rec
                    ordered_keys.append(key)

    records = [parsed_by_nim[k] for k in ordered_keys]
    if not records:
        if pages_without_text == total_pages:
            raise ValueError(
                "PDF tampak berupa gambar hasil pindai tanpa teks terpilih (memerlukan OCR). "
                "Tidak ada data yang dipalsukan."
            )
        raise ValueError(
            "Tidak ada data tabel poin mahasiswa yang berhasil dibaca dari PDF. "
            "Pastikan PDF berisi tabel dengan kolom NIM/Student Reg Number, Nama, Prodi, dan Poin."
        )

    for idx, rec in enumerate(records, start=1):
        if rec["row_number"] is None:
            rec["row_number"] = idx

    points_list = [r["sabbath_points"] for r in records]
    sorted_points = sorted(points_list)
    n = len(points_list)
    median_points = (
        float(sorted_points[n // 2])
        if n % 2 == 1
        else round((sorted_points[n // 2 - 1] + sorted_points[n // 2]) / 2.0, 1)
    )

    zero_point_count = sum(1 for p in points_list if p == 0)
    with_point_count = n - zero_point_count
    max_points = max(points_list)
    avg_points = round(sum(points_list) / n, 1)

    prodi_map: Dict[str, List[int]] = {}
    for rec in records:
        prodi_map.setdefault(rec["study_program"], []).append(rec["sabbath_points"])

    prodi_summary = []
    for prodi_name, pts in sorted(prodi_map.items(), key=lambda kv: -len(kv[1])):
        prodi_summary.append({
            "study_program": prodi_name,
            "total_students": len(pts),
            "zero_point_students": sum(1 for p in pts if p == 0),
            "students_with_points": sum(1 for p in pts if p > 0),
            "avg_points": round(sum(pts) / len(pts), 1),
            "max_points": max(pts),
        })

    return {
        "file_name": filename,
        "detected_faculty": detected_faculty,
        "total_pages": total_pages,
        "total_rows": n,
        "zero_point_count": zero_point_count,
        "with_point_count": with_point_count,
        "max_points": max_points,
        "avg_points": avg_points,
        "median_points": median_points,
        "duplicate_count": duplicate_count,
        "invalid_row_count": invalid_row_count,
        "missing_nim_count": missing_nim_count,
        "pages_without_text": pages_without_text,
        "prodi_summary": prodi_summary,
        "warnings": warnings[:50],
        "records": records,
    }
