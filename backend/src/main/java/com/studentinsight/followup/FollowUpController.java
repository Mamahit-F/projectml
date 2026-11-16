package com.studentinsight.followup;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.followup.dto.CreateFollowUpRequest;
import com.studentinsight.followup.dto.FollowUpDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/follow-ups")
@RequiredArgsConstructor
public class FollowUpController {

    private final FollowUpService followUpService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")
    public ResponseEntity<ApiResponse<List<FollowUpDTO>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok("Follow-up records retrieved", followUpService.getAllFollowUps()));
    }

    @GetMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")
    public ResponseEntity<ApiResponse<List<FollowUpDTO>>> getByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.ok("Student follow-ups retrieved", followUpService.getFollowUpsByStudent(studentId)));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")
    public ResponseEntity<ApiResponse<FollowUpDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Follow-up record retrieved", followUpService.getFollowUpById(id)));
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")
    public ResponseEntity<ApiResponse<FollowUpDTO>> create(@Valid @RequestBody CreateFollowUpRequest request) {
        FollowUpDTO created = followUpService.createFollowUp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Follow-up session recorded", created));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")
    public ResponseEntity<ApiResponse<FollowUpDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String evaluationResult) {
        return ResponseEntity.ok(ApiResponse.ok("Follow-up status updated", followUpService.updateStatus(id, status, evaluationResult)));
    }
}
