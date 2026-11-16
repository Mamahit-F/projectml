package com.studentinsight.attendance;

import com.studentinsight.attendance.dto.AttendanceRuleDTO;
import com.studentinsight.attendance.dto.UpdateAttendanceRuleRequest;
import com.studentinsight.common.ApiResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/attendance-rules")
@RequiredArgsConstructor
public class AttendanceRuleController {

    private final AttendanceRuleService ruleService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceRuleDTO>>> getAllRules() {
        return ResponseEntity.ok(ApiResponse.ok("Attendance rules retrieved", ruleService.getAllRules()));
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<ApiResponse<List<AttendanceRuleDTO>>> getRulesByCategory(@PathVariable Long categoryId) {
        return ResponseEntity.ok(ApiResponse.ok("Rules for category retrieved", ruleService.getRulesByCategory(categoryId)));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<AttendanceRuleDTO>> updateRule(
            @PathVariable Long id,
            @Valid @RequestBody UpdateAttendanceRuleRequest request) {
        return ResponseEntity.ok(ApiResponse.ok("Attendance rule updated successfully", ruleService.updateRule(id, request)));
    }
}
