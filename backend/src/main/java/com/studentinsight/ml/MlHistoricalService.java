package com.studentinsight.ml;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentinsight.audit.AuditLogService;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import com.studentinsight.user.User;
import com.studentinsight.user.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;

@Slf4j
@Service
@RequiredArgsConstructor
public class MlHistoricalService {

    private final MlClientService mlClientService;
    private final MlDatasetVersionRepository datasetVersionRepository;
    private final MlTrainingRunRepository trainingRunRepository;
    private final MlModelRecordRepository modelRecordRepository;
    private final MlPredictionLogRepository predictionLogRepository;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private User getCurrentUser() {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
                return userRepository.findByUsername(auth.getName()).orElse(null);
            }
        } catch (Exception ignored) {
        }
        return null;
    }

    public Map<String, Object> getStatus() {
        try {
            Map<String, Object> res = mlClientService.get("/ml/status", null);
            Map<String, Object> enriched = new LinkedHashMap<>(res);
            enriched.put("ml_service_online", true);
            enriched.put("db_logged_dataset_versions", datasetVersionRepository.count());
            enriched.put("db_logged_training_runs", trainingRunRepository.count());
            enriched.put("db_logged_models", modelRecordRepository.count());
            enriched.put("db_logged_predictions", predictionLogRepository.count());
            return enriched;
        } catch (MlServiceUnavailableException ex) {
            Map<String, Object> fallback = new LinkedHashMap<>();
            fallback.put("service_status", "UNAVAILABLE");
            fallback.put("ml_service_online", false);
            fallback.put("dataset_ready", false);
            fallback.put("error", ex.getMessage());
            fallback.put("db_logged_dataset_versions", datasetVersionRepository.count());
            fallback.put("db_logged_training_runs", trainingRunRepository.count());
            fallback.put("db_logged_models", modelRecordRepository.count());
            fallback.put("db_logged_predictions", predictionLogRepository.count());
            return fallback;
        }
    }

    public Map<String, Object> getDatasetSummary(String datasetVersion) {
        return mlClientService.get("/ml/dataset/summary",
                datasetVersion != null ? Map.of("dataset_version", datasetVersion) : null);
    }

    public Map<String, Object> getDatasetQuality(String datasetVersion) {
        return mlClientService.get("/ml/dataset/quality",
                datasetVersion != null ? Map.of("dataset_version", datasetVersion) : null);
    }

    public Map<String, Object> getStudentsContinuity(
            String datasetVersion,
            String status,
            String search,
            String faculty,
            String eligibleFor,
            int page,
            int size) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (datasetVersion != null) params.put("dataset_version", datasetVersion);
        if (status != null) params.put("status", status);
        if (search != null) params.put("search", search);
        if (faculty != null) params.put("faculty", faculty);
        if (eligibleFor != null) params.put("eligible_for", eligibleFor);
        params.put("page", page);
        params.put("size", size);
        return mlClientService.get("/ml/students/continuity", params);
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> processHistoricalData(Map<String, Object> requestBody) {
        Map<String, Object> res = mlClientService.post("/ml/process-data", requestBody);

        try {
            String versionCode = asString(res.get("dataset_version"));
            if (versionCode != null && datasetVersionRepository.findByVersionCode(versionCode).isEmpty()) {
                Map<String, Object> ext = asMap(res.get("extraction_summary"));
                Map<String, Object> ident = asMap(res.get("identity_summary"));
                MlDatasetVersion entity = MlDatasetVersion.builder()
                        .versionCode(versionCode)
                        .datasetFingerprint(asStringOrDefault(res.get("dataset_fingerprint"), "unknown"))
                        .sourceDirectory(asStringOrDefault(requestBody != null ? requestBody.get("data_dir") : null, "DEFAULT_HISTORICAL_DIR"))
                        .foldersScanned(asInt(ext.get("folders_scanned")))
                        .filesTotal(asInt(ext.get("files_discovered")))
                        .filesSucceeded(asInt(ext.get("files_succeeded")))
                        .filesFailed(asInt(ext.get("files_failed")))
                        .totalRecords(asInt(ext.get("total_records_extracted")))
                        .uniqueStudents(asInt(ident.get("unique_students_total")))
                        .verifiedStudents(asInt(ident.get("unique_verified_students")))
                        .uncertainIdentities(asInt(ident.get("unique_uncertain_entities")))
                        .qualityStatus(asStringOrDefault(res.get("quality_status"), "UNKNOWN"))
                        .summaryJson(toJsonSafe(res.get("continuity_summary")))
                        .processedByUser(getCurrentUser())
                        .build();
                datasetVersionRepository.save(entity);
            }
            auditLogService.log("PROCESS_HISTORICAL_DATA", "MlDatasetVersion", null,
                    null, versionCode, "Processed historical PDF/XLSX dataset (" + versionCode + ")");
        } catch (Exception ex) {
            log.warn("Non-fatal DB metadata sync warning after processHistoricalData: {}", ex.getMessage());
        }

        return res;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> trainClustering(Map<String, Object> requestBody) {
        Map<String, Object> res = mlClientService.post("/ml/train/clustering", requestBody);
        syncTrainingRunAndModels("CLUSTERING", res, requestBody);
        return res;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> trainPrediction(Map<String, Object> requestBody) {
        Map<String, Object> res = mlClientService.post("/ml/train/prediction", requestBody);
        String task = requestBody != null && requestBody.get("task") != null
                ? "SUPERVISED_" + String.valueOf(requestBody.get("task")).toUpperCase()
                : "SUPERVISED_BOTH";
        syncTrainingRunAndModels(task, res, requestBody);
        return res;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> trainAll(Map<String, Object> requestBody) {
        Map<String, Object> res = mlClientService.post("/ml/train/all", requestBody);
        if (res.get("clustering") instanceof Map) {
            syncTrainingRunAndModels("CLUSTERING", (Map<String, Object>) res.get("clustering"), requestBody);
        }
        if (res.get("supervised") instanceof Map) {
            syncTrainingRunAndModels("SUPERVISED_BOTH", (Map<String, Object>) res.get("supervised"), requestBody);
        }
        return res;
    }

    public Map<String, Object> listModels(String modelType) {
        return mlClientService.get("/ml/models",
                modelType != null ? Map.of("model_type", modelType) : null);
    }

    public Map<String, Object> compareModels(String modelType) {
        return mlClientService.get("/ml/models/compare",
                modelType != null ? Map.of("model_type", modelType) : null);
    }

    public Map<String, Object> getSelectedModels() {
        return mlClientService.get("/ml/models/selected", null);
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> selectModel(Map<String, Object> requestBody) {
        Map<String, Object> res = mlClientService.post("/ml/models/select", requestBody);
        try {
            Map<String, Object> m = asMap(res.get("model"));
            String modelId = asString(m.get("model_id"));
            String modelType = asString(m.get("model_type"));
            if (modelId != null && modelType != null) {
                for (MlModelRecord rec : modelRecordRepository.findByModelType(modelType)) {
                    boolean active = modelId.equals(rec.getModelId());
                    rec.setSelected(active);
                    if (active) {
                        rec.setStatus("ACTIVE");
                        rec.setSelectedAt(Instant.now());
                        rec.setSelectionNotes(asString(requestBody != null ? requestBody.get("notes") : null));
                    } else if ("ACTIVE".equals(rec.getStatus())) {
                        rec.setStatus("ARCHIVED");
                    }
                    modelRecordRepository.save(rec);
                }
                if (modelRecordRepository.findByModelId(modelId).isEmpty()) {
                    persistSingleModel(m);
                }
                auditLogService.log("SELECT_ML_MODEL", "MlModel", null, null, modelId,
                        "Activated ML model " + modelId + " for " + modelType);
            }
        } catch (Exception ex) {
            log.warn("Non-fatal DB metadata sync warning after selectModel: {}", ex.getMessage());
        }
        return res;
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public Map<String, Object> predictStudent(Map<String, Object> requestBody) {
        Map<String, Object> res = mlClientService.post("/ml/predict", requestBody);
        try {
            if (Boolean.TRUE.equals(res.get("eligible"))) {
                Map<String, Object> stuMap = asMap(res.get("student"));
                Map<String, Object> regMap = asMap(res.get("regression_estimate"));
                Map<String, Object> clsMap = asMap(res.get("classification_estimate"));
                String nim = asString(stuMap.get("nim"));
                Student studentEntity = (nim != null && !nim.isBlank())
                        ? studentRepository.findByNim(nim).orElse(null)
                        : null;

                MlPredictionLog logEntry = MlPredictionLog.builder()
                        .datasetVersionCode(asString(res.get("dataset_version")))
                        .regressionModelId(asString(regMap.get("model_id")))
                        .classificationModelId(asString(clsMap.get("model_id")))
                        .internalStudentId(asStringOrDefault(stuMap.get("internal_student_id"), "UNKNOWN"))
                        .student(studentEntity)
                        .nim(nim)
                        .predictedNextPoints(asDouble(regMap.get("predicted_next_points")))
                        .predictedCategory(asString(clsMap.get("predicted_category")))
                        .confidence(asDouble(clsMap.get("confidence")))
                        .probabilitiesJson(toJsonSafe(clsMap.get("probabilities")))
                        .featuresUsedJson(toJsonSafe(res.get("features_used")))
                        .requestedByUser(getCurrentUser())
                        .build();
                predictionLogRepository.save(logEntry);
            }
        } catch (Exception ex) {
            log.warn("Non-fatal DB prediction log warning: {}", ex.getMessage());
        }
        return res;
    }

    public Map<String, Object> predictBatch(Map<String, Object> requestBody) {
        return mlClientService.post("/ml/predict/batch", requestBody);
    }

    public Map<String, Object> getTrainingHistory() {
        return mlClientService.get("/ml/training/history", null);
    }

    public Map<String, Object> getClusters(String modelId, Integer sampleLimit) {
        Map<String, Object> params = new LinkedHashMap<>();
        if (modelId != null) params.put("model_id", modelId);
        if (sampleLimit != null) params.put("sample_limit", sampleLimit);
        return mlClientService.get("/ml/clusters", params);
    }

    public Map<String, Object> getEvaluation() {
        return mlClientService.get("/ml/evaluation", null);
    }

    @SuppressWarnings("unchecked")
    private void syncTrainingRunAndModels(String taskType, Map<String, Object> res, Map<String, Object> reqBody) {
        try {
            String runId = asString(res.get("run_id"));
            String dsVer = asString(res.get("dataset_version"));
            if (runId != null && trainingRunRepository.findByRunCode(runId).isEmpty()) {
                MlTrainingRun run = MlTrainingRun.builder()
                        .runCode(runId)
                        .datasetVersionCode(dsVer)
                        .taskType(taskType)
                        .status("SUCCESS".equalsIgnoreCase(asString(res.get("status"))) ? "COMPLETED" : "FAILED")
                        .parametersJson(toJsonSafe(reqBody))
                        .metricsSummaryJson(toJsonSafe(res.get("metrics")))
                        .triggeredByUser(getCurrentUser())
                        .completedAt(Instant.now())
                        .build();
                trainingRunRepository.save(run);
            }
            if (res.get("model") instanceof Map) {
                persistSingleModel((Map<String, Object>) res.get("model"));
            }
            if (res.get("registered_models") instanceof List) {
                for (Object item : (List<Object>) res.get("registered_models")) {
                    if (item instanceof Map) {
                        persistSingleModel((Map<String, Object>) item);
                    }
                }
            }
            auditLogService.log("TRAIN_ML_" + taskType, "MlTrainingRun", null,
                    null, runId, "Executed ML training task " + taskType + " on dataset " + dsVer);
        } catch (Exception ex) {
            log.warn("Non-fatal DB metadata sync warning after training {}: {}", taskType, ex.getMessage());
        }
    }

    private void persistSingleModel(Map<String, Object> m) {
        String modelId = asString(m.get("model_id"));
        if (modelId == null || modelRecordRepository.findByModelId(modelId).isPresent()) {
            return;
        }
        MlModelRecord rec = MlModelRecord.builder()
                .modelId(modelId)
                .runCode(asString(m.get("run_id")))
                .datasetVersionCode(asString(m.get("dataset_version")))
                .modelName(asStringOrDefault(m.get("model_name"), modelId))
                .modelType(asStringOrDefault(m.get("model_type"), "UNKNOWN"))
                .algorithm(asStringOrDefault(m.get("algorithm"), "UNKNOWN"))
                .version(asStringOrDefault(m.get("version"), "v1"))
                .artifactPath(asString(m.get("artifact_path")))
                .targetDefinition(asString(m.get("target_definition")))
                .featuresJson(toJsonSafe(m.get("features")))
                .parametersJson(toJsonSafe(m.get("parameters")))
                .evaluationMetricsJson(toJsonSafe(m.get("evaluation_metrics")))
                .adequate(Boolean.TRUE.equals(m.get("adequate")))
                .status(asStringOrDefault(m.get("status"), "CANDIDATE"))
                .selected(Boolean.TRUE.equals(m.get("is_selected")))
                .selectionReason(asString(m.get("selection_reason")))
                .build();
        modelRecordRepository.save(rec);
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> asMap(Object obj) {
        return obj instanceof Map ? (Map<String, Object>) obj : Map.of();
    }

    private String asString(Object obj) {
        return obj == null ? null : String.valueOf(obj);
    }

    private String asStringOrDefault(Object obj, String def) {
        return (obj == null || String.valueOf(obj).isBlank()) ? def : String.valueOf(obj);
    }

    private int asInt(Object obj) {
        return obj instanceof Number ? ((Number) obj).intValue() : 0;
    }

    private Double asDouble(Object obj) {
        return obj instanceof Number ? ((Number) obj).doubleValue() : null;
    }

    private String toJsonSafe(Object obj) {
        if (obj == null) return null;
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
