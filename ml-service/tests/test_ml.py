import io
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.pdf_parser import _parse_table_row, _parse_text_lines_fallback, _detect_faculty

client = TestClient(app)


def _build_minimal_pdf_bytes(lines: list[str]) -> bytes:
    """Build a valid single-page PDF containing text lines for end-to-end pdfplumber testing."""
    content_ops = ["BT", "/F1 10 Tf", "40 760 Td", "14 TL"]
    for idx, line in enumerate(lines):
        safe = line.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")
        if idx == 0:
            content_ops.append(f"({safe}) Tj")
        else:
            content_ops.append(f"T* ({safe}) Tj")
    content_ops.append("ET")
    stream = "\n".join(content_ops).encode("latin-1")

    objects = [
        b"1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj\n",
        b"2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj\n",
        b"3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj\n",
        f"4 0 obj << /Length {len(stream)} >> stream\n".encode("latin-1") + stream + b"\nendstream endobj\n",
        b"5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj\n",
    ]

    buf = io.BytesIO()
    buf.write(b"%PDF-1.4\n")
    offsets = [0]
    for obj in objects:
        offsets.append(buf.tell())
        buf.write(obj)
    xref_pos = buf.tell()
    buf.write(f"xref\n0 {len(objects) + 1}\n".encode("latin-1"))
    buf.write(b"0000000000 65535 f \n")
    for off in offsets[1:]:
        buf.write(f"{off:010d} 00000 n \n".encode("latin-1"))
    buf.write(f"trailer << /Size {len(objects) + 1} /Root 1 0 R >>\nstartxref\n{xref_pos}\n%%EOF\n".encode("latin-1"))
    return buf.getvalue()


def test_health_check():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "UP"
    assert "pdf_parsing" in data["capabilities"]
    assert "dynamic_kmeans_clustering" in data["capabilities"]


def test_model_info():
    resp = client.get("/model/info")
    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "DynamicKMeansRiskAnalyzer"
    assert data["target_classes"] == ["SAFE", "LOW", "MEDIUM", "HIGH"]


def test_pdf_table_row_parsing_handles_edge_cases():
    row1 = _parse_table_row(["1", "12510613", "Lumoring", "Kenneth Haliman", "Informatika", "204"])
    assert row1 is not None
    assert row1["nim"] == "12510613"
    assert row1["full_name"] == "Kenneth Haliman Lumoring"
    assert row1["study_program"] == "Informatika"
    assert row1["sabbath_points"] == 204

    row2 = _parse_table_row(["56", "S22229040", "", "Kartika Sari", "Sistem Informasi", "146"])
    assert row2 is not None
    assert row2["nim"] == "S22229040"
    assert row2["full_name"] == "Kartika Sari"
    assert row2["last_name"] == ""
    assert row2["sabbath_points"] == 146

    row3 = _parse_table_row(["78", "S22310221", "-", "Rikardo Riwan", "Teknologi Informasi", "132"])
    assert row3 is not None
    assert row3["full_name"] == "Rikardo Riwan"
    assert row3["last_name"] == ""

    # Spilled long name characters into prodi cell (real edge cases from PDF)
    row4 = _parse_table_row(["69", "S22110190", "Gonzalez", "Bonito Arantes Nancimento Riw", "u Informatika", "142"])
    assert row4 is not None
    assert row4["full_name"] == "Bonito Arantes Nancimento Riwu Gonzalez"
    assert row4["study_program"] == "Informatika"

    row5 = _parse_table_row(["578", "12510463", "Ginting", "Dwayne Zafnat Vandeventer Mo", "zart Informatika", "0"])
    assert row5 is not None
    assert row5["full_name"] == "Dwayne Zafnat Vandeventer Mozart Ginting"
    assert row5["study_program"] == "Informatika"

    assert _parse_table_row(["NO", "STUDENT REG NUMBER", "LAST NAME", "FIRST NAME", "PRODI", "POIN SABAT"]) is None


def test_pdf_text_fallback_and_faculty_detection():
    text = """FAKULTAS ILMU KOMPUTER
1 12510613 Lumoring Kenneth Haliman Informatika 204
2 S22310477 Lumatau Rivanda Elva Sistem Informasi 196
621 12410192 Limbong Tiara Informatika
0
"""
    assert _detect_faculty(text) == "Fakultas Ilmu Komputer"
    recs = _parse_text_lines_fallback(text)
    assert len(recs) == 3
    assert recs[0]["sabbath_points"] == 204
    assert recs[1]["nim"] == "S22310477"
    assert recs[2]["sabbath_points"] == 0


def test_parse_pdf_end_to_end_real_pdf_bytes():
    pdf_bytes = _build_minimal_pdf_bytes([
        "FAKULTAS ILMU KOMPUTER",
        "1 12510613 Lumoring Kenneth Haliman Informatika 204",
        "2 S22310477 Lumatau Rivanda Elva Sistem Informasi 196",
        "3 12410500 Adam Jeremy Isaiah Teknologi Informasi 176",
        "4 S22310221 - Rikardo Riwan Teknologi Informasi 132",
        "5 12410192 Limbong Tiara Informatika 0",
    ])
    resp = client.post(
        "/parse-pdf",
        files={"file": ("poin_fik_6nov.pdf", pdf_bytes, "application/pdf")},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["detected_faculty"] == "Fakultas Ilmu Komputer"
    assert data["total_rows"] == 5
    assert data["zero_point_count"] == 1
    assert data["with_point_count"] == 4
    assert data["max_points"] == 204
    assert len(data["prodi_summary"]) == 3


def test_parse_pdf_rejects_non_pdf():
    resp = client.post(
        "/parse-pdf",
        files={"file": ("notes.txt", b"hello world", "text/plain")},
    )
    assert resp.status_code == 400


def test_dynamic_risk_analysis_single_and_multi_period():
    payload = {
        "report_date": "2026-11-06",
        "semester_start_date": "2026-08-17",
        "attendance_cutoff_date": "2026-11-27",
        "final_point_limit": None,
        "attendance_closed": False,
        "students": [
            {"student_id": 1, "nim": "12510613", "study_program": "Informatika", "sabbath_points": 204, "points_delta": 24,
             "history": [{"report_date": "2026-10-16", "sabbath_points": 180}, {"report_date": "2026-11-06", "sabbath_points": 204}]},
            {"student_id": 2, "nim": "12410601", "study_program": "Sistem Informasi", "sabbath_points": 160, "points_delta": 16},
            {"student_id": 3, "nim": "S22310477", "study_program": "Sistem Informasi", "sabbath_points": 80, "points_delta": 8},
            {"student_id": 4, "nim": "12410171", "study_program": "Informatika", "sabbath_points": 64, "points_delta": 4},
            {"student_id": 5, "nim": "12410500", "study_program": "Teknologi Informasi", "sabbath_points": 16, "points_delta": 0},
            {"student_id": 6, "nim": "S22310615", "study_program": "Informatika", "sabbath_points": 8, "points_delta": 0},
            {"student_id": 7, "nim": "12410192", "study_program": "Informatika", "sabbath_points": 0, "points_delta": 0},
        ],
    }
    resp = client.post("/analyze-risk", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["analysis_mode"] == "MULTI_PERIOD_KMEANS_PROJECTION"
    assert data["summary"]["total"] == 7
    assert data["summary"]["safe_count"] == 1
    assert data["summary"]["high_count"] >= 1
    assert "SAFE" in data["cluster_ranges"]
    assert "HIGH" in data["cluster_ranges"]

    by_nim = {r["nim"]: r for r in data["results"]}
    assert by_nim["12410192"]["risk_category"] == "SAFE"
    assert by_nim["12410192"]["projected_end_points"] == 0.0
    assert by_nim["12510613"]["risk_category"] == "HIGH"
    assert by_nim["12510613"]["projected_end_points"] > 204.0


def test_dynamic_risk_analysis_when_attendance_closed_with_final_limit():
    payload = {
        "report_date": "2026-11-27",
        "semester_start_date": "2026-08-17",
        "attendance_cutoff_date": "2026-11-27",
        "final_point_limit": 100,
        "attendance_closed": True,
        "students": [
            {"student_id": 1, "nim": "12510613", "sabbath_points": 204},
            {"student_id": 2, "nim": "S22310477", "sabbath_points": 80},
            {"student_id": 3, "nim": "12410500", "sabbath_points": 12},
            {"student_id": 4, "nim": "12410192", "sabbath_points": 0},
        ],
    }
    resp = client.post("/analyze-risk", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["summary"]["exceeds_final_limit_count"] == 1
    by_nim = {r["nim"]: r for r in data["results"]}
    assert by_nim["12510613"]["projected_end_points"] == 204.0
    assert by_nim["12510613"]["exceeds_final_limit"] is True
    assert by_nim["S22310477"]["exceeds_final_limit"] is False
