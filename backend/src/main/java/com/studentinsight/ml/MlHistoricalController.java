package com.studentinsight.ml;

import com.studentinsight.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/ml")
@RequiredArgsConstructor
public class MlHistoricalController {

    private final MlHistoricalService mlHistoricalService;

    @GetMapping("/status")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStatus() {
        return ResponseEntity.ok(ApiResponse.ok("Status layanan Machine Learning dimuat", mlHistoricalService.getStatus()));
    }

    @GetMapping("/dataset/summary")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDatasetSummary(
            @RequestParam(required = false) String datasetVersion) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Ringkasan dataset historis dimuat",
                mlHistoricalService.getDatasetSummary(datasetVersion)));
    }

    @GetMapping("/dataset/quality")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getDatasetQuality(
            @RequestParam(required = false) String datasetVersion) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Laporan kualitas data historis dimuat",
                mlHistoricalService.getDatasetQuality(datasetVersion)));
    }

    @GetMapping("/students/continuity")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getStudentsContinuity(
            @RequestParam(required = false) String datasetVersion,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String faculty,
            @RequestParam(required = false) String eligibleFor,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Analisis kontinuitas mahasiswa dimuat",
                mlHistoricalService.getStudentsContinuity(datasetVersion, status, search, faculty, eligibleFor, page, size)));
    }

    @PostMapping("/process-data")
    public ResponseEntity<ApiResponse<Map<String, Object>>> processData(
            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Pemrosesan dataset historis selesai",
                mlHistoricalService.processHistoricalData(body)));
    }

    @PostMapping("/train/clustering")
    public ResponseEntity<ApiResponse<Map<String, Object>>> trainClustering(
            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Pelatihan clustering selesai",
                mlHistoricalService.trainClustering(body)));
    }

    @PostMapping("/train/prediction")
    public ResponseEntity<ApiResponse<Map<String, Object>>> trainPrediction(
            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Pelatihan model prediksi supervised selesai",
                mlHistoricalService.trainPrediction(body)));
    }

    @PostMapping("/train/all")
    public ResponseEntity<ApiResponse<Map<String, Object>>> trainAll(
            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Pelatihan penuh seluruh pipeline ML selesai",
                mlHistoricalService.trainAll(body)));
    }

    @GetMapping("/models")
    public ResponseEntity<ApiResponse<Map<String, Object>>> listModels(
            @RequestParam(required = false) String modelType) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Daftar model ML dimuat",
                mlHistoricalService.listModels(modelType)));
    }

    @GetMapping("/models/compare")
    public ResponseEntity<ApiResponse<Map<String, Object>>> compareModels(
            @RequestParam(required = false) String modelType) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Perbandingan performa model dimuat",
                mlHistoricalService.compareModels(modelType)));
    }

    @GetMapping("/models/selected")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSelectedModels() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Model aktif dimuat",
                mlHistoricalService.getSelectedModels()));
    }

    @PostMapping("/models/select")
    public ResponseEntity<ApiResponse<Map<String, Object>>> selectModel(
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Model aktif berhasil diperbarui",
                mlHistoricalService.selectModel(body)));
    }

    @PostMapping("/predict")
    public ResponseEntity<ApiResponse<Map<String, Object>>> predictStudent(
            @RequestBody Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Estimasi prediksi periode mendatang berhasil dihitung",
                mlHistoricalService.predictStudent(body)));
    }

    @PostMapping("/predict/batch")
    public ResponseEntity<ApiResponse<Map<String, Object>>> predictBatch(
            @RequestBody(required = false) Map<String, Object> body) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Prediksi batch selesai",
                mlHistoricalService.predictBatch(body)));
    }

    @GetMapping("/training/history")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getTrainingHistory() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Riwayat pelatihan ML dimuat",
                mlHistoricalService.getTrainingHistory()));
    }

    @GetMapping("/clusters")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getClusters(
            @RequestParam(required = false) String modelId,
            @RequestParam(required = false) Integer sampleLimit) {
        return ResponseEntity.ok(ApiResponse.ok(
                "Profil klaster mahasiswa dimuat",
                mlHistoricalService.getClusters(modelId, sampleLimit)));
    }

    @GetMapping("/evaluation")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getEvaluation() {
        return ResponseEntity.ok(ApiResponse.ok(
                "Hasil evaluasi model ML dimuat",
                mlHistoricalService.getEvaluation()));
    }
}
