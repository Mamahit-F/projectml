package com.studentinsight.pdfreport;

import com.studentinsight.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/pdf-reports")
@RequiredArgsConstructor
public class PdfReportController {

    private final PdfReportService pdfReportService;

    @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> previewPdf(@RequestParam("file") MultipartFile file) {
        Map<String, Object> preview = pdfReportService.previewPdf(file);
        return ResponseEntity.ok(ApiResponse.ok("Pratinjau dokumen PDF berhasil dibaca", preview));
    }

    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<Map<String, Object>>> importPdf(
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate reportDate,
            @RequestParam(required = false) String facultyName,
            @RequestParam(required = false) String periodLabel,
            @RequestParam(required = false) String notes) {
        Map<String, Object> result = pdfReportService.importPdf(file, reportDate, facultyName, periodLabel, notes);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Laporan PDF berhasil disimpan dan dianalisis risikonya", result));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<Map<String, Object>>>> getAllReports() {
        return ResponseEntity.ok(ApiResponse.ok("Arsip laporan PDF dimuat", pdfReportService.getAllReports()));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getReportDetail(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Detail laporan PDF dimuat", pdfReportService.getReportDetail(id)));
    }

    @GetMapping("/{id}/records")
    public ResponseEntity<ApiResponse<Page<Map<String, Object>>>> getReportRecords(
            @PathVariable Long id,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String studyProgram,
            @RequestParam(required = false) String riskCategory,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size) {
        Page<Map<String, Object>> records = pdfReportService.getReportRecords(
                id, search, studyProgram, riskCategory,
                PageRequest.of(page, size, Sort.by(Sort.Order.desc("sabbathPoints"), Sort.Order.asc("rowNumber"))));
        return ResponseEntity.ok(ApiResponse.ok("Daftar poin mahasiswa dalam laporan dimuat", records));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<Void>> deleteReport(@PathVariable Long id) {
        pdfReportService.deleteReport(id);
        return ResponseEntity.ok(ApiResponse.ok("Arsip laporan PDF berhasil dihapus", null));
    }
}
