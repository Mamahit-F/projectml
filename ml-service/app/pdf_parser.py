import io
import re
from typing import Any, Dict, List, Optional, Tuple
import pdfplumber

HEADER_KEYWORDS = {
    "no",
    "student reg",
    "student reg number",
    "reg number",
    "nim",
    "last name",
    "first name",
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
    ("Keperawatan", "Keperawatan"),
    ("Pendidikan Bahasa Inggris", "Pendidikan Bahasa Inggris"),
    ("Pendidikan Agama", "Pendidikan Agama"),
    ("Filsafat", "Filsafat"),
    ("Arsitektur", "Arsitektur"),
    ("Pertanian", "Pertanian"),
    ("Sekretari", "Sekretari"),
]


def _clean_cell(val: Optional[str]) -> str:
    if val is None:
        return ""
    return re.sub(r"\s+", " ", str(val)).strip()


def _is_header_row(cells: List[str]) -> bool:
    joined = " ".join(c.lower() for c in cells if c)
    if not joined:
        return True
    matches = sum(1 for kw in HEADER_KEYWORDS if kw in joined)
    return matches >= 2


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
    cleaned = _clean_cell(val).replace(",", "").replace(".", "")
    if re.fullmatch(r"\d+", cleaned):
        return int(cleaned)
    return None


def _detect_faculty(first_page_text: str) -> str:
    if not first_page_text:
        return "Universitas Klabat"
    for line in first_page_text.splitlines():
        line_clean = _clean_cell(line)
        if not line_clean:
            continue
        upper = line_clean.upper()
        if upper.startswith("FAKULTAS") or "FACULTY" in upper:
            return line_clean.title() if upper == line_clean else line_clean
    # Fallback: check top lines before table header
    for line in first_page_text.splitlines()[:5]:
        line_clean = _clean_cell(line)
        if line_clean and not _is_header_row([line_clean]) and not re.match(r"^\d+\s+", line_clean):
            return line_clean
    return "Universitas Klabat"


def _normalize_prodi_and_first_name(first_name: str, prodi: str) -> Tuple[str, str]:
    clean_first = _clean_cell(first_name)
    clean_prodi = _clean_cell(prodi)
    if not clean_prodi:
        return clean_first, "Umum"

    for pattern, canonical in KNOWN_PRODI_PATTERNS:
        lower_p = clean_prodi.lower()
        lower_pat = pattern.lower()
        if lower_p == lower_pat:
            return clean_first, canonical
        if lower_p.endswith(lower_pat):
            prefix = clean_prodi[: len(clean_prodi) - len(pattern)].strip()
            # Re-attach spilled trailing letters from long first names (e.g., "Riw" + "u Informatika")
            if prefix and re.fullmatch(r"[A-Za-z.\-']{1,10}", prefix):
                clean_first = f"{clean_first}{prefix}" if clean_first else prefix
            return clean_first, canonical

    return clean_first, clean_prodi


def _parse_table_row(row: List[Optional[str]]) -> Optional[Dict[str, Any]]:
    cells = [_clean_cell(c) for c in row]
    if not any(cells) or _is_header_row(cells):
        return None

    # Expected 6 columns: [NO, STUDENT REG NUMBER, LAST NAME, FIRST NAME, PRODI, POIN SABAT]
    if len(cells) >= 6:
        row_num = _parse_int(cells[0])
        nim = cells[1].replace(" ", "")
        last_name = cells[2]
        first_name = cells[3]
        prodi = cells[4]
        points = _parse_int(cells[5])

        if nim and points is not None and re.match(r"^[A-Za-z0-9\-]{5,20}$", nim):
            fixed_first, fixed_prodi = _normalize_prodi_and_first_name(first_name, prodi)
            c_first, c_last, full_name = _normalize_name(fixed_first, last_name)
            return {
                "row_number": row_num,
                "nim": nim.upper(),
                "last_name": c_last,
                "first_name": c_first,
                "full_name": full_name,
                "study_program": fixed_prodi,
                "sabbath_points": max(0, points),
            }

    # Handle 5-column layout: [NO, NIM, FULL NAME, PRODI, POIN] or [NIM, LAST, FIRST, PRODI, POIN]
    if len(cells) == 5:
        maybe_num = _parse_int(cells[0])
        points = _parse_int(cells[4])
        if maybe_num is not None and points is not None and re.match(r"^[A-Za-z0-9\-]{5,20}$", cells[1]):
            fixed_full, fixed_prodi = _normalize_prodi_and_first_name(cells[2], cells[3])
            full = _clean_cell(fixed_full)
            parts = full.split()
            c_first = " ".join(parts[:-1]) if len(parts) > 1 else full
            c_last = parts[-1] if len(parts) > 1 else ""
            return {
                "row_number": maybe_num,
                "nim": cells[1].upper(),
                "last_name": c_last,
                "first_name": c_first,
                "full_name": full or "Tanpa Nama",
                "study_program": fixed_prodi,
                "sabbath_points": max(0, points),
            }
        if points is not None and re.match(r"^[A-Za-z0-9\-]{5,20}$", cells[0]):
            fixed_first, fixed_prodi = _normalize_prodi_and_first_name(cells[2], cells[3])
            c_first, c_last, full_name = _normalize_name(fixed_first, cells[1])
            return {
                "row_number": None,
                "nim": cells[0].upper(),
                "last_name": c_last,
                "first_name": c_first,
                "full_name": full_name,
                "study_program": fixed_prodi,
                "sabbath_points": max(0, points),
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
        # Sometimes points wrap to the next line (like OCR page 14)
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
    # Format: <NO> <NIM> <NAMES...> <PRODI> <POINTS>
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

    # Remove standalone leading '-' when last_name was '-'
    name_part = re.sub(r"^-\s+", "", name_part).strip()
    tokens = name_part.split()
    if len(tokens) >= 2:
        # In the PDF, LAST NAME comes first, FIRST NAME comes second
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


def parse_points_pdf(file_bytes: bytes, filename: str = "report.pdf") -> Dict[str, Any]:
    warnings: List[str] = []
    parsed_by_nim: Dict[str, Dict[str, Any]] = {}
    ordered_nims: List[str] = []
    detected_faculty = "Universitas Klabat"
    total_pages = 0

    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        total_pages = len(pdf.pages)
        if total_pages == 0:
            raise ValueError("Dokumen PDF kosong atau tidak memiliki halaman.")

        first_text = pdf.pages[0].extract_text() or ""
        detected_faculty = _detect_faculty(first_text)

        for page_idx, page in enumerate(pdf.pages, start=1):
            page_records: List[Dict[str, Any]] = []
            tables = page.extract_tables() or []

            for table in tables:
                for row in table:
                    if not row:
                        continue
                    rec = _parse_table_row(row)
                    if rec:
                        page_records.append(rec)

            # Fallback to text-line parsing if table extraction found nothing on this page
            if not page_records:
                text = page.extract_text() or ""
                page_records = _parse_text_lines_fallback(text)

            if not page_records:
                warnings.append(f"Halaman {page_idx}: tidak ditemukan baris data mahasiswa yang valid.")

            for rec in page_records:
                nim = rec["nim"]
                if nim in parsed_by_nim:
                    warnings.append(f"NIM duplikat terdeteksi ({nim}); menggunakan data terakhir.")
                    parsed_by_nim[nim] = rec
                else:
                    parsed_by_nim[nim] = rec
                    ordered_nims.append(nim)

    records = [parsed_by_nim[n] for n in ordered_nims]
    if not records:
        raise ValueError(
            "Tidak ada data tabel poin mahasiswa yang berhasil dibaca dari PDF. "
            "Pastikan PDF berisi tabel dengan kolom NIM/Student Reg Number, Nama, Prodi, dan Poin."
        )

    # Ensure row_number is always populated
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

    # Per-prodi summary
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
        "prodi_summary": prodi_summary,
        "warnings": warnings[:20],
        "records": records,
    }
