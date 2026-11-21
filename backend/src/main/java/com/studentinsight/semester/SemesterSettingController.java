package com.studentinsight.semester;

import com.studentinsight.common.ApiResponse;
import com.studentinsight.prediction.MLPredictionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/semester-settings")
@RequiredArgsConstructor
public class SemesterSettingController {

    private final SemesterSettingService semesterSettingService;
    private final MLPredictionService predictionService;

    @GetMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> getSettings() {
        SemesterSetting setting = semesterSettingService.getOrCreateDefault();
        return ResponseEntity.ok(ApiResponse.ok("Pengaturan semester berhasil dimuat", semesterSettingService.toResponseMap(setting)));
    }

    @PutMapping
    public ResponseEntity<ApiResponse<Map<String, Object>>> updateSettings(
            @RequestBody SemesterSetting request,
            @RequestParam(defaultValue = "true") boolean reanalyze) {
        SemesterSetting saved = semesterSettingService.updateSettings(request);
        if (reanalyze) {
            try {
                predictionService.analyzeAllActiveStudents(null);
            } catch (Exception ignored) {
            }
        }
        return ResponseEntity.ok(ApiResponse.ok("Pengaturan semester berhasil diperbarui", semesterSettingService.toResponseMap(saved)));
    }
}
