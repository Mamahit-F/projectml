package com.studentinsight;

import com.studentinsight.audit.AuditLogService;
import com.studentinsight.ml.*;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MlHistoricalServiceTest {

    @Mock
    private MlClientService mlClientService;

    @Mock
    private MlDatasetVersionRepository datasetVersionRepository;

    @Mock
    private MlTrainingRunRepository trainingRunRepository;

    @Mock
    private MlModelRecordRepository modelRecordRepository;

    @Mock
    private MlPredictionLogRepository predictionLogRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private AuditLogService auditLogService;

    @InjectMocks
    private MlHistoricalService mlHistoricalService;

    @Test
    void getStatus_WhenMlServiceOnline_ReturnsEnrichedStatus() {
        when(mlClientService.get("/ml/status", null)).thenReturn(Map.of(
                "service_status", "UP",
                "dataset_ready", true,
                "latest_dataset_version", "ds_v1_abc123"
        ));
        when(datasetVersionRepository.count()).thenReturn(1L);
        when(trainingRunRepository.count()).thenReturn(2L);
        when(modelRecordRepository.count()).thenReturn(7L);
        when(predictionLogRepository.count()).thenReturn(3L);

        Map<String, Object> result = mlHistoricalService.getStatus();

        assertEquals(true, result.get("ml_service_online"));
        assertEquals("UP", result.get("service_status"));
        assertEquals(7L, result.get("db_logged_models"));
    }

    @Test
    void getStatus_WhenMlServiceUnavailable_DegradesGracefullyWithoutCrashing() {
        when(mlClientService.get("/ml/status", null))
                .thenThrow(new MlServiceUnavailableException("ML Service offline"));
        when(datasetVersionRepository.count()).thenReturn(1L);
        when(trainingRunRepository.count()).thenReturn(2L);
        when(modelRecordRepository.count()).thenReturn(7L);
        when(predictionLogRepository.count()).thenReturn(0L);

        Map<String, Object> result = mlHistoricalService.getStatus();

        assertEquals(false, result.get("ml_service_online"));
        assertEquals("UNAVAILABLE", result.get("service_status"));
        assertTrue(String.valueOf(result.get("error")).contains("offline"));
    }

    @Test
    void processHistoricalData_PersistsDatasetVersionAndLogsAudit() {
        Map<String, Object> mlResp = Map.of(
                "status", "SUCCESS",
                "dataset_version", "ds_v1_test123",
                "dataset_fingerprint", "test123",
                "quality_status", "VALID_WITH_WARNINGS",
                "extraction_summary", Map.of(
                        "folders_scanned", 5,
                        "files_discovered", 35,
                        "files_succeeded", 35,
                        "files_failed", 0,
                        "total_records_extracted", 9572
                ),
                "identity_summary", Map.of(
                        "unique_students_total", 2911,
                        "unique_verified_students", 2827,
                        "unique_uncertain_entities", 84
                ),
                "continuity_summary", Map.of("continuously_observed", 1090)
        );
        when(mlClientService.post(eq("/ml/process-data"), any())).thenReturn(mlResp);
        when(datasetVersionRepository.findByVersionCode("ds_v1_test123")).thenReturn(Optional.empty());

        Map<String, Object> res = mlHistoricalService.processHistoricalData(Map.of("use_cache", true));

        assertEquals("ds_v1_test123", res.get("dataset_version"));
        verify(datasetVersionRepository, times(1)).save(any(MlDatasetVersion.class));
        verify(auditLogService, times(1)).log(eq("PROCESS_HISTORICAL_DATA"), eq("MlDatasetVersion"), isNull(), isNull(), eq("ds_v1_test123"), anyString());
    }

    @Test
    void selectModel_UpdatesActiveFlagAndAuditsSelection() {
        MlModelRecord oldActive = MlModelRecord.builder()
                .modelId("reg_old")
                .modelType("REGRESSION")
                .status("ACTIVE")
                .selected(true)
                .build();
        MlModelRecord newCandidate = MlModelRecord.builder()
                .modelId("reg_new")
                .modelType("REGRESSION")
                .status("CANDIDATE")
                .selected(false)
                .build();

        when(mlClientService.post(eq("/ml/models/select"), any())).thenReturn(Map.of(
                "status", "SELECTED",
                "model", Map.of("model_id", "reg_new", "model_type", "REGRESSION")
        ));
        when(modelRecordRepository.findByModelType("REGRESSION")).thenReturn(List.of(oldActive, newCandidate));
        when(modelRecordRepository.findByModelId("reg_new")).thenReturn(Optional.of(newCandidate));

        mlHistoricalService.selectModel(Map.of("model_id", "reg_new", "notes", "Reviewed RMSE"));

        assertFalse(oldActive.isSelected());
        assertEquals("ARCHIVED", oldActive.getStatus());
        assertTrue(newCandidate.isSelected());
        assertEquals("ACTIVE", newCandidate.getStatus());
        verify(auditLogService, times(1)).log(eq("SELECT_ML_MODEL"), eq("MlModel"), isNull(), isNull(), eq("reg_new"), anyString());
    }

    @Test
    void predictStudent_LinksExistingStudentAndLogsPrediction() {
        Student stu = Student.builder().id(42L).nim("12510613").fullName("Kenneth Haliman Lumoring").build();
        when(studentRepository.findByNim("12510613")).thenReturn(Optional.of(stu));
        when(mlClientService.post(eq("/ml/predict"), any())).thenReturn(Map.of(
                "eligible", true,
                "dataset_version", "ds_v1_test123",
                "student", Map.of("internal_student_id", "STU-123", "nim", "12510613"),
                "regression_estimate", Map.of("model_id", "reg_v1", "predicted_next_points", 112.5),
                "classification_estimate", Map.of("model_id", "cls_v1", "predicted_category", "HIGH", "confidence", 0.88, "probabilities", Map.of("HIGH", 0.88)),
                "features_used", Map.of("current_points", 48.0)
        ));

        Map<String, Object> res = mlHistoricalService.predictStudent(Map.of("nim", "12510613"));

        assertEquals(true, res.get("eligible"));
        verify(predictionLogRepository, times(1)).save(any(MlPredictionLog.class));
    }
}
