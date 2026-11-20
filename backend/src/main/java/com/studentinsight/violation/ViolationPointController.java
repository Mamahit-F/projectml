package com.studentinsight.violation;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.violation.dto.ManualPointAdjustmentRequest;
import com.studentinsight.violation.dto.ViolationPointDTO;
import com.studentinsight.violation.dto.ViolationPointRuleDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/violation-points")
@RequiredArgsConstructor
public class ViolationPointController {

    private final ViolationPointService violationPointService;

    @GetMapping
    public ResponseEntity<ApiResponse<Page<ViolationPointDTO>>> getAllViolations(
            @RequestParam(required = false) Long studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Violation history retrieved",
                violationPointService.getAllViolations(studentId, PageRequest.of(page, size))));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<ViolationPointDTO>>> getStudentViolations(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.ok("Violation history retrieved", violationPointService.getStudentViolations(studentId)));
    }

    @GetMapping("/rules")
    public ResponseEntity<ApiResponse<List<ViolationPointRuleDTO>>> getAllRules() {
        return ResponseEntity.ok(ApiResponse.ok("Violation point rules retrieved", violationPointService.getAllRules()));
    }

    @PostMapping("/manual-adjustment")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ViolationPointDTO>> manualAdjustment(@Valid @RequestBody ManualPointAdjustmentRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Point adjustment recorded successfully", violationPointService.manualPointAdjustment(request)));
    }

    @PostMapping("/{id}/cancel")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<ViolationPointDTO>> cancelViolation(
            @PathVariable Long id,
            @RequestParam(defaultValue = "Koreksi manual oleh Administrator") String reason) {
        return ResponseEntity.ok(ApiResponse.ok("Violation cancelled successfully", violationPointService.cancelViolation(id, reason)));
    }
}
