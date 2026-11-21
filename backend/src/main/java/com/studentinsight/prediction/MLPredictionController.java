package com.studentinsight.prediction;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.prediction.dto.StudentPredictionDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/predictions")
@RequiredArgsConstructor
public class MLPredictionController {

    private final MLPredictionService predictionService;

    @GetMapping("/summary")
    public ResponseEntity<ApiResponse<PredictionSummaryDTO>> getSummary() {
        return ResponseEntity.ok(ApiResponse.ok("Ringkasan analisis risiko dimuat", predictionService.getSummary()));
    }

    @GetMapping("/latest")
    public ResponseEntity<ApiResponse<List<StudentPredictionDTO>>> getAllLatest(
            @RequestParam(required = false) String riskLevel,
            @RequestParam(required = false) String studyProgram,
            @RequestParam(required = false) String search) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Hasil deteksi risiko terbaru dimuat",
                predictionService.getAllLatestPredictions(riskLevel, studyProgram, search)));
    }

    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<StudentPredictionDTO>> getLatestByStudent(@PathVariable Long studentId) {
        return predictionService.getLatestPrediction(studentId)
                .map(pred -> ResponseEntity.ok(ApiResponse.ok("Prediksi mahasiswa dimuat", pred)))
                .orElseGet(() -> ResponseEntity.ok(ApiResponse.ok("Belum ada analisis untuk mahasiswa ini", null)));
    }

    @PostMapping({"/analyze", "/predict-all"})
    public ResponseEntity<ApiResponse<List<StudentPredictionDTO>>> runBatchAnalysis() {
        List<StudentPredictionDTO> results = predictionService.analyzeAllActiveStudents(null);
        return ResponseEntity.ok(ApiResponse.ok("Analisis risiko dinamis & proyeksi selesai untuk seluruh mahasiswa aktif", results));
    }
}
