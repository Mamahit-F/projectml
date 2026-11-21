package com.studentinsight.report;

import com.studentinsight.followup.FollowUpRecord;
import com.studentinsight.followup.FollowUpRecordRepository;
import com.studentinsight.pdfreport.PdfReport;
import com.studentinsight.pdfreport.PdfReportRepository;
import com.studentinsight.prediction.MLPredictionService;
import com.studentinsight.prediction.dto.StudentPredictionDTO;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.welfare.WelfareReport;
import com.studentinsight.welfare.WelfareReportRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@RestController
@RequestMapping("/api/v1/reports")
@RequiredArgsConstructor
public class ReportController {

    private static final MediaType XLSX_MEDIA_TYPE =
            MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    private static final DateTimeFormatter DATE_TIME_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy HH:mm");

    private final StudentRepository studentRepository;
    private final MLPredictionService predictionService;
    private final FollowUpRecordRepository followUpRepository;
    private final WelfareReportRepository welfareReportRepository;
    private final PdfReportRepository pdfReportRepository;

    @GetMapping("/students")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportStudentsExcel() throws IOException {
        List<Student> list = studentRepository.findAll().stream()
                .sorted(Comparator.comparingInt((Student s) -> s.getLatestSabbathPoints() == null ? 0 : s.getLatestSabbathPoints()).reversed())
                .toList();

        List<String> headers = List.of(
                "No",
                "Nomor Registrasi",
                "Nama Lengkap",
                "Program Studi",
                "Fakultas",
                "Poin Sabat",
                "Perubahan",
                "Proyeksi Akhir",
                "Tingkat Risiko",
                "Kategori Tempat Tinggal",
                "Alamat Kos",
                "Status"
        );

        List<List<Object>> rows = new ArrayList<>();
        int no = 1;
        for (Student s : list) {
            rows.add(List.of(
                    no++,
                    s.getNim(),
                    s.getFullName(),
                    s.getStudyProgram(),
                    s.getFaculty(),
                    s.getLatestSabbathPoints() != null ? s.getLatestSabbathPoints() : 0,
                    s.getPointsDelta() != null ? s.getPointsDelta() : 0,
                    s.getProjectedEndPoints() != null ? Math.round(s.getProjectedEndPoints() * 10.0) / 10.0 : 0.0,
                    s.getRiskCategory() != null ? s.getRiskCategory() : "SAFE",
                    s.getResidenceCategory() != null ? s.getResidenceCategory().getName() : "Belum Dilengkapi",
                    s.getCurrentAddress() != null ? s.getCurrentAddress() : "-",
                    s.getStatus() != null ? s.getStatus() : "ACTIVE"
            ));
        }

        byte[] bytes = ExcelReportBuilder.buildWorkbook(
                "Rekap Mahasiswa",
                "STUDENTINSIGHT — REKAPITULASI MAHASISWA & POIN SABAT",
                "Universitas Klabat (Diurutkan dari Poin Sabat Tertinggi)",
                headers,
                rows,
                8
        );
        return excelResponse("rekap_mahasiswa_poin.xlsx", bytes);
    }

    @GetMapping("/predictions")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportPredictionsExcel() throws IOException {
        List<StudentPredictionDTO> list = predictionService.getAllLatestPredictions(null, null, null);

        List<String> headers = List.of(
                "No",
                "Nomor Registrasi",
                "Nama Lengkap",
                "Program Studi",
                "Poin Saat Ini",
                "Perubahan",
                "Proyeksi Akhir",
                "Persentil",
                "Kategori Risiko",
                "Peluang Tinggi (%)",
                "Melewati Batas Final"
        );

        List<List<Object>> rows = new ArrayList<>();
        int no = 1;
        for (StudentPredictionDTO p : list) {
            double highPct = p.getProbHigh() != null ? Math.round(p.getProbHigh() * 1000.0) / 10.0 : 0.0;
            rows.add(List.of(
                    no++,
                    p.getStudentNim() != null ? p.getStudentNim() : "-",
                    p.getStudentName() != null ? p.getStudentName() : "-",
                    p.getStudyProgram() != null ? p.getStudyProgram() : "-",
                    p.getCurrentPoints() != null ? p.getCurrentPoints() : 0,
                    p.getPointsDelta() != null ? p.getPointsDelta() : 0,
                    p.getProjectedEndPoints() != null ? Math.round(p.getProjectedEndPoints() * 10.0) / 10.0 : 0.0,
                    p.getPercentileRank() != null ? p.getPercentileRank() : 0.0,
                    p.getRiskCategory() != null ? p.getRiskCategory() : "SAFE",
                    highPct,
                    p.isExceedsFinalLimit() ? "YA" : "TIDAK"
            ));
        }

        byte[] bytes = ExcelReportBuilder.buildWorkbook(
                "Deteksi Risiko",
                "STUDENTINSIGHT — HASIL DETEKSI RISIKO & PROYEKSI AKHIR SEMESTER",
                "Pengelompokan Klaster Dinamis (Dynamic K-Means Clustering)",
                headers,
                rows,
                8
        );
        return excelResponse("rekap_deteksi_risiko.xlsx", bytes);
    }

    @GetMapping("/follow-ups")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportFollowUpsExcel() throws IOException {
        List<FollowUpRecord> list = followUpRepository.findAll();

        List<String> headers = List.of(
                "No",
                "Tanggal Konseling",
                "Nomor Registrasi",
                "Nama Mahasiswa",
                "Program Studi",
                "Topik Pembinaan",
                "Rencana Tindak Lanjut",
                "Status",
                "Hasil Evaluasi"
        );

        List<List<Object>> rows = new ArrayList<>();
        int no = 1;
        for (FollowUpRecord f : list) {
            rows.add(List.of(
                    no++,
                    f.getCounselingDate() != null ? f.getCounselingDate().toString() : "-",
                    f.getStudent() != null ? f.getStudent().getNim() : "-",
                    f.getStudent() != null ? f.getStudent().getFullName() : "-",
                    f.getStudent() != null ? f.getStudent().getStudyProgram() : "-",
                    f.getTopicsDiscussed() != null ? f.getTopicsDiscussed() : "-",
                    f.getActionPlan() != null ? f.getActionPlan() : "-",
                    f.getStatus() != null ? f.getStatus() : "-",
                    f.getEvaluationResult() != null ? f.getEvaluationResult() : "-"
            ));
        }

        byte[] bytes = ExcelReportBuilder.buildWorkbook(
                "Pembinaan",
                "STUDENTINSIGHT — REKAP PEMBINAAN & KONSELING MAHASISWA",
                "Pilar Kedisiplinan Universitas Klabat",
                headers,
                rows,
                -1
        );
        return excelResponse("rekap_pembinaan_konseling.xlsx", bytes);
    }

    @GetMapping("/welfare")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportWelfareExcel() throws IOException {
        List<WelfareReport> list = welfareReportRepository.findAll();

        List<String> headers = List.of(
                "No",
                "Tanggal Laporan",
                "Nomor Registrasi",
                "Nama Mahasiswa",
                "Jenis Kendala",
                "Prioritas",
                "Status",
                "Deskripsi Kendala",
                "Catatan Penyelesaian"
        );

        List<List<Object>> rows = new ArrayList<>();
        int no = 1;
        for (WelfareReport w : list) {
            String createdStr = w.getCreatedAt() != null
                    ? w.getCreatedAt().atZone(ZoneId.systemDefault()).format(DATE_TIME_FMT)
                    : "-";
            rows.add(List.of(
                    no++,
                    createdStr,
                    w.getStudent() != null ? w.getStudent().getNim() : "-",
                    w.getStudent() != null ? w.getStudent().getFullName() : "-",
                    w.getReportType() != null ? w.getReportType() : "-",
                    w.getPriority() != null ? w.getPriority() : "-",
                    w.getStatus() != null ? w.getStatus() : "-",
                    w.getDescription() != null ? w.getDescription() : "-",
                    w.getResolutionNotes() != null ? w.getResolutionNotes() : "-"
            ));
        }

        byte[] bytes = ExcelReportBuilder.buildWorkbook(
                "Kesejahteraan",
                "STUDENTINSIGHT — REKAP KESEJAHTERAAN & KEAMANAN MAHASISWA",
                "Pilar Kesejahteraan & Keamanan di Luar Asrama",
                headers,
                rows,
                -1
        );
        return excelResponse("rekap_kesejahteraan_keamanan.xlsx", bytes);
    }

    @GetMapping("/pdf-archive")
    @Transactional(readOnly = true)
    public ResponseEntity<byte[]> exportPdfArchiveExcel() throws IOException {
        List<PdfReport> list = pdfReportRepository.findAllByOrderByReportDateDescCreatedAtDesc();

        List<String> headers = List.of(
                "No",
                "Tanggal Laporan",
                "Periode",
                "Fakultas",
                "Nama File PDF",
                "Total Mahasiswa",
                "Tertib (0 Poin)",
                "Berpoin",
                "Poin Tertinggi",
                "Rata-rata Poin"
        );

        List<List<Object>> rows = new ArrayList<>();
        int no = 1;
        for (PdfReport r : list) {
            rows.add(List.of(
                    no++,
                    r.getReportDate() != null ? r.getReportDate().toString() : "-",
                    r.getPeriodLabel() != null ? r.getPeriodLabel() : "-",
                    r.getFacultyName() != null ? r.getFacultyName() : "-",
                    r.getFileName() != null ? r.getFileName() : "-",
                    r.getTotalStudents() != null ? r.getTotalStudents() : 0,
                    r.getZeroPointStudents() != null ? r.getZeroPointStudents() : 0,
                    r.getStudentsWithPoints() != null ? r.getStudentsWithPoints() : 0,
                    r.getMaxPoints() != null ? r.getMaxPoints() : 0,
                    r.getAvgPoints() != null ? r.getAvgPoints() : 0.0
            ));
        }

        byte[] bytes = ExcelReportBuilder.buildWorkbook(
                "Arsip PDF",
                "STUDENTINSIGHT — RINGKASAN ARSIP LAPORAN PDF",
                "Riwayat Unggahan Laporan Poin Sabat",
                headers,
                rows,
                -1
        );
        return excelResponse("arsip_laporan_pdf.xlsx", bytes);
    }

    private ResponseEntity<byte[]> excelResponse(String filename, byte[] bytes) {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(XLSX_MEDIA_TYPE)
                .body(bytes);
    }
}
