package com.studentinsight.followup;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.followup.dto.CreateFollowUpRequest;
import com.studentinsight.followup.dto.FollowUpDTO;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/follow-ups")
@RequiredArgsConstructor
public class FollowUpController {

    private final FollowUpService followUpService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<FollowUpDTO>>> getAll() {
        return ResponseEntity.ok(ApiResponse.ok("Catatan pembinaan dimuat", followUpService.getAllFollowUps()));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<FollowUpDTO>>> getByStudent(@PathVariable Long studentId) {
        return ResponseEntity.ok(ApiResponse.ok("Catatan pembinaan mahasiswa dimuat", followUpService.getFollowUpsByStudent(studentId)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<FollowUpDTO>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok("Detail pembinaan dimuat", followUpService.getFollowUpById(id)));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<FollowUpDTO>> create(@Valid @RequestBody CreateFollowUpRequest request) {
        FollowUpDTO created = followUpService.createFollowUp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok("Catatan pembinaan disimpan", created));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<FollowUpDTO>> updateStatus(
            @PathVariable Long id,
            @RequestParam String status,
            @RequestParam(required = false) String evaluationResult) {
        return ResponseEntity.ok(ApiResponse.ok("Status pembinaan diperbarui", followUpService.updateStatus(id, status, evaluationResult)));
    }
}
