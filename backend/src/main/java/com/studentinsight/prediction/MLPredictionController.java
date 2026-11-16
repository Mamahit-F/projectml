package com.studentinsight.prediction;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.prediction.dto.StudentPredictionDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
public class MLPredictionController {

    private final MLPredictionService predictionService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PredictionSummaryDTO>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok("Prediction risk summary retrieved", predictionService.getSummary()));
    }

    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<List<StudentPredictionDTO>>> getAllLatest() {
        return ResponseEntity.ok(ApiResponse.ok("Latest predictions for all students retrieved", predictionService.getAllLatestPredictions()));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<StudentPredictionDTO>> getLatestByStudent(@PathVariable Long studentId) {
        return predictionService.getLatestPrediction(studentId)
                .map(pred -> ResponseEntity.ok(ApiResponse.ok("Latest prediction retrieved", pred)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok("No prediction yet", null)));
    }

    @PostMapping("/student/{studentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")
    public ResponseEntity<ApiResponse<StudentPredictionDTO>> runPredictionForStudent(@PathVariable Long studentId) {
        StudentPredictionDTO pred = predictionService.predictStudentRisk(studentId);
        return ResponseEntity.ok(ApiResponse.ok("Prediction calculated and saved", pred));
    }

    @PostMapping("/predict-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'VILLAGE_DEAN')")
    public ResponseEntity<ApiResponse<List<StudentPredictionDTO>>> runBatchPredictions() {
        List<StudentPredictionDTO> results = predictionService.predictAllActiveStudents();
        return ResponseEntity.ok(ApiResponse.ok("Batch prediction finished for all active students", results));
    }
}
