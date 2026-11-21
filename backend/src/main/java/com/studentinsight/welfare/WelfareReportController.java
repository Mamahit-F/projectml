package com.studentinsight.welfare;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.welfare.dto.CreateWelfareReportRequest;
import com.studentinsight.welfare.dto.UpdateWelfareReportRequest;
import com.studentinsight.welfare.dto.WelfareReportDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/welfare-reports")
@RequiredArgsConstructor
public class WelfareReportController {

    private final WelfareReportService reportService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<WelfareReportDTO>>> searchReports(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String priority,
            @RequestParam(required = false) String reportType,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Page<WelfareReportDTO> reports = reportService.searchReports(status, priority, reportType, PageRequest.of(page, size));
        return ResponseEntity.ok(ApiResponse.ok("Laporan kesejahteraan dimuat", reports));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<WelfareReportDTO>>> getByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.ok("Laporan kesejahteraan mahasiswa dimuat", reportService.getReportsByStudent(studentId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WelfareReportDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Detail laporan kesejahteraan dimuat", reportService.getReportById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<WelfareReportDTO>> create(@Valid @RequestBody CreateWelfareReportRequest request) {
        WelfareReportDTO created = reportService.createReport(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Laporan kesejahteraan dibuat", created));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<WelfareReportDTO>> update(@PathVariable Long id, @Valid @RequestBody UpdateWelfareReportRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Laporan kesejahteraan diperbarui", reportService.updateReport(id, request)));
    }
}
