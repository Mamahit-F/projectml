package com.studentinsight.prediction;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentinsight.audit.AuditLogService;
import com.studentinsight.pdfreport.PdfReport;
import com.studentinsight.pdfreport.PdfReportRepository;
import com.studentinsight.pdfreport.StudentPointRecord;
import com.studentinsight.pdfreport.StudentPointRecordRepository;
import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.prediction.dto.StudentPredictionDTO;
import com.studentinsight.semester.SemesterSetting;
import com.studentinsight.semester.SemesterSettingService;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.sql.Types;
import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MLPredictionService {

    private final MLPredictionRepository predictionRepository;
    private final StudentRepository studentRepository;
    private final PdfReportRepository pdfReportRepository;
    private final StudentPointRecordRepository pointRecordRepository;
    private final SemesterSettingService semesterSettingService;
    private final AuditLogService auditLogService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired(required = false)
    private JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @Value("${app.ml.service-url:http://localhost:8001}")
    private String mlServiceUrl;

    @Value("${app.ml.api-key:}")
    private String mlApiKey;

    @Transactional(readOnly = true)
    public Optional<StudentPredictionDTO> getLatestPrediction(Long studentId) {
        SemesterSetting setting = semesterSettingService.getOrCreateDefault();
        return predictionRepository.findFirstByStudentIdOrderByPredictedAtDescIdDesc(studentId)
                .map(p -> StudentPredictionDTO.fromEntity(p, setting.getFinalPointLimit()));
    }

    @Transactional(readOnly = true)
    public List<StudentPredictionDTO> getAllLatestPredictions(String riskLevel, String studyProgram, String search) {
        SemesterSetting setting = semesterSettingService.getOrCreateDefault();
        List<MLPrediction> latest = predictionRepository.findLatestPredictionsForAllStudents();

        return latest.stream()
                .map(p -> StudentPredictionDTO.fromEntity(p, setting.getFinalPointLimit()))
                .filter(dto -> riskLevel == null || riskLevel.isBlank() || riskLevel.equalsIgnoreCase(dto.getRiskCategory()))
                .filter(dto -> studyProgram == null || studyProgram.isBlank()
                        || (dto.getStudyProgram() != null && dto.getStudyProgram().equalsIgnoreCase(studyProgram)))
                .filter(dto -> {
                    if (search == null || search.isBlank()) return true;
                    String q = search.trim().toLowerCase();
                    return (dto.getStudentNim() != null && dto.getStudentNim().toLowerCase().contains(q))
                            || (dto.getStudentName() != null && dto.getStudentName().toLowerCase().contains(q))
                            || (dto.getStudyProgram() != null && dto.getStudyProgram().toLowerCase().contains(q));
                })
                .sorted(Comparator.comparingInt((StudentPredictionDTO d) -> d.getCurrentPoints() != null ? d.getCurrentPoints() : 0).reversed())
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PredictionSummaryDTO getSummary() {
        SemesterSetting setting = semesterSettingService.getOrCreateDefault();
        Optional<PdfReport> latestReport = pdfReportRepository.findFirstByOrderByReportDateDescCreatedAtDesc();
        List<MLPrediction> latest = predictionRepository.findLatestPredictionsForAllStudents();

        long total = latest.size();
        long safe = latest.stream().filter(p -> "SAFE".equalsIgnoreCase(p.getRiskCategory())).count();
        long low = latest.stream().filter(p -> "LOW".equalsIgnoreCase(p.getRiskCategory())).count();
        long med = latest.stream().filter(p -> "MEDIUM".equalsIgnoreCase(p.getRiskCategory())).count();
        long high = latest.stream().filter(p -> "HIGH".equalsIgnoreCase(p.getRiskCategory())).count();

        Integer limit = setting.getFinalPointLimit();
        long exceeds = limit == null ? 0 : latest.stream()
                .filter(p -> (p.getCurrentPoints() != null ? p.getCurrentPoints() : 0) >= limit)
                .count();

        // Compute dynamic cluster ranges directly from latest snapshot predictions
        Map<String, Map<String, Integer>> clusterRanges = new LinkedHashMap<>();
        for (String tier : List.of("SAFE", "LOW", "MEDIUM", "HIGH")) {
            List<Integer> pts = latest.stream()
                    .filter(p -> tier.equalsIgnoreCase(p.getRiskCategory()))
                    .map(p -> p.getCurrentPoints() != null ? p.getCurrentPoints() : 0)
                    .toList();
            if (!pts.isEmpty()) {
                Map<String, Integer> range = new LinkedHashMap<>();
                range.put("min", Collections.min(pts));
                range.put("max", Collections.max(pts));
                clusterRanges.put(tier, range);
            }
        }

        String mode = latest.isEmpty() ? "DYNAMIC_KMEANS_CLUSTERING" : latest.get(0).getAnalysisMode();
        String modelName = latest.isEmpty() ? "DynamicKMeansRiskAnalyzer" : latest.get(0).getModelName();

        return PredictionSummaryDTO.builder()
                .totalPredicted(total)
                .safeCount(safe)
                .lowRiskCount(low)
                .mediumRiskCount(med)
                .highRiskCount(high)
                .safePercentage(total > 0 ? Math.round(((double) safe / total) * 1000.0) / 10.0 : 0.0)
                .lowRiskPercentage(total > 0 ? Math.round(((double) low / total) * 1000.0) / 10.0 : 0.0)
                .mediumRiskPercentage(total > 0 ? Math.round(((double) med / total) * 1000.0) / 10.0 : 0.0)
                .highRiskPercentage(total > 0 ? Math.round(((double) high / total) * 1000.0) / 10.0 : 0.0)
                .exceedsFinalLimitCount(exceeds)
                .analysisMode(mode)
                .modelName(modelName)
                .latestReportDate(latestReport.map(PdfReport::getReportDate).orElse(null))
                .attendanceCutoffDate(setting.getAttendanceCutoffDate())
                .finalPointLimit(limit)
                .attendanceClosed(setting.isAttendanceClosed())
                .clusterRanges(clusterRanges)
                .build();
    }

    @Transactional
    @SuppressWarnings("unchecked")
    public List<StudentPredictionDTO> analyzeAllActiveStudents(PdfReport targetReport) {
        List<Student> activeStudents = studentRepository.findByStatus("ACTIVE");
        if (activeStudents.isEmpty()) {
            return List.of();
        }

        SemesterSetting setting = semesterSettingService.getOrCreateDefault();
        PdfReport reportRef = targetReport != null ? targetReport
                : pdfReportRepository.findFirstByOrderByReportDateDescCreatedAtDesc().orElse(null);
        LocalDate reportDate = reportRef != null ? reportRef.getReportDate() : LocalDate.now();

        // Build historical point map per student across all uploaded PDFs
        Map<Long, List<Map<String, Object>>> historyByStudent = new HashMap<>();
        for (StudentPointRecord rec : pointRecordRepository.findAllWithReportOrdered()) {
            Map<String, Object> item = new HashMap<>();
            item.put("report_date", rec.getPdfReport().getReportDate().toString());
            item.put("sabbath_points", rec.getSabbathPoints());
            historyByStudent.computeIfAbsent(rec.getStudent().getId(), k -> new ArrayList<>()).add(item);
        }

        List<Map<String, Object>> studentInputs = new ArrayList<>();
        Map<Long, Student> studentMap = new HashMap<>();

        for (Student s : activeStudents) {
            studentMap.put(s.getId(), s);
            Map<String, Object> entry = new HashMap<>();
            entry.put("student_id", s.getId());
            entry.put("nim", s.getNim());
            entry.put("study_program", s.getStudyProgram());
            entry.put("sabbath_points", s.getLatestSabbathPoints() != null ? s.getLatestSabbathPoints() : 0);
            entry.put("points_delta", s.getPointsDelta() != null ? s.getPointsDelta() : 0);
            entry.put("history", historyByStudent.getOrDefault(s.getId(), List.of()));
            studentInputs.add(entry);
        }

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("report_date", reportDate.toString());
        requestBody.put("semester_start_date", setting.getSemesterStartDate().toString());
        requestBody.put("attendance_cutoff_date", setting.getAttendanceCutoffDate().toString());
        requestBody.put("final_point_limit", setting.getFinalPointLimit());
        requestBody.put("attendance_closed", setting.isAttendanceClosed());
        requestBody.put("students", studentInputs);

        Map<String, Object> mlResponse = callAnalyzeService(requestBody, activeStudents, setting, reportDate, historyByStudent);

        String modelName = String.valueOf(mlResponse.getOrDefault("model_name", "DynamicKMeansRiskAnalyzer"));
        String modelVersion = String.valueOf(mlResponse.getOrDefault("model_version", "2.0"));
        String analysisMode = String.valueOf(mlResponse.getOrDefault("analysis_mode", "DYNAMIC_KMEANS_CLUSTERING"));
        List<Map<String, Object>> results = (List<Map<String, Object>>) mlResponse.getOrDefault("results", List.of());

        // Map existing point records if targetReport is present
        Map<Long, StudentPointRecord> reportRecordMap = new HashMap<>();
        if (reportRef != null) {
            for (StudentPointRecord r : pointRecordRepository.findByPdfReportIdOrderBySabbathPointsDescRowNumberAsc(reportRef.getId())) {
                reportRecordMap.put(r.getStudent().getId(), r);
            }
        }

        List<MLPrediction> predictionsToSave = new ArrayList<>();
        List<Student> studentsToUpdate = new ArrayList<>();
        List<StudentPointRecord> recordsToUpdate = new ArrayList<>();

        for (Map<String, Object> item : results) {
            Long sid = item.get("student_id") != null ? ((Number) item.get("student_id")).longValue() : null;
            Student student = sid != null ? studentMap.get(sid) : null;
            if (student == null) continue;

            String risk = String.valueOf(item.getOrDefault("risk_category", "SAFE"));
            int currentPts = item.get("current_points") != null ? ((Number) item.get("current_points")).intValue() : 0;
            int deltaPts = item.get("points_delta") != null ? ((Number) item.get("points_delta")).intValue() : 0;
            double projected = item.get("projected_end_points") != null ? ((Number) item.get("projected_end_points")).doubleValue() : currentPts;
            double percentile = item.get("percentile_rank") != null ? ((Number) item.get("percentile_rank")).doubleValue() : 0.0;

            Map<String, Object> probs = (Map<String, Object>) item.getOrDefault("probabilities", Map.of());
            double probLow = probs.get("LOW") != null ? ((Number) probs.get("LOW")).doubleValue() : 0.0;
            double probMed = probs.get("MEDIUM") != null ? ((Number) probs.get("MEDIUM")).doubleValue() : 0.0;
            double probHigh = probs.get("HIGH") != null ? ((Number) probs.get("HIGH")).doubleValue() : 0.0;

            student.setRiskCategory(risk);
            student.setProjectedEndPoints(projected);
            studentsToUpdate.add(student);

            if (reportRecordMap.containsKey(student.getId())) {
                StudentPointRecord rec = reportRecordMap.get(student.getId());
                rec.setRiskCategory(risk);
                rec.setProjectedEndPoints(projected);
                rec.setPercentileRank(percentile);
                recordsToUpdate.add(rec);
            }

            MLPrediction pred = MLPrediction.builder()
                    .student(student)
                    .pdfReport(reportRef)
                    .riskCategory(risk)
                    .probLow(probLow)
                    .probMedium(probMed)
                    .probHigh(probHigh)
                    .modelName(modelName)
                    .modelVersion(modelVersion)
                    .analysisMode(analysisMode)
                    .currentPoints(currentPts)
                    .pointsDelta(deltaPts)
                    .projectedEndPoints(projected)
                    .percentileRank(percentile)
                    .featuresSnapshot(serializeSafe(Map.of(
                            "sabbath_points", currentPts,
                            "points_delta", deltaPts,
                            "percentile_rank", percentile,
                            "projected_end_points", projected,
                            "report_date", reportDate.toString()
                    )))
                    .build();
            predictionsToSave.add(pred);
        }

        Instant now = Instant.now();
        List<StudentPredictionDTO> dtoList;
        if (jdbcTemplate != null) {
            if (!studentsToUpdate.isEmpty()) {
                jdbcTemplate.batchUpdate(
                        "UPDATE students SET risk_category = ?, projected_end_points = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                        studentsToUpdate,
                        200,
                        (ps, s) -> {
                            ps.setString(1, s.getRiskCategory());
                            ps.setObject(2, s.getProjectedEndPoints(), Types.DOUBLE);
                            ps.setLong(3, s.getId());
                        }
                );
            }
            if (!recordsToUpdate.isEmpty()) {
                jdbcTemplate.batchUpdate(
                        "UPDATE student_point_records SET risk_category = ?, projected_end_points = ?, percentile_rank = ? WHERE id = ?",
                        recordsToUpdate,
                        200,
                        (ps, r) -> {
                            ps.setString(1, r.getRiskCategory());
                            ps.setObject(2, r.getProjectedEndPoints(), Types.DOUBLE);
                            ps.setObject(3, r.getPercentileRank(), Types.DOUBLE);
                            ps.setLong(4, r.getId());
                        }
                );
            }
            if (!predictionsToSave.isEmpty()) {
                Long reportIdRef = reportRef != null ? reportRef.getId() : null;
                jdbcTemplate.batchUpdate(
                        "INSERT INTO ml_predictions (student_id, pdf_report_id, risk_category, prob_low, prob_medium, prob_high, " +
                                "model_name, model_version, features_snapshot, projected_end_points, points_delta, current_points, " +
                                "percentile_rank, analysis_mode, predicted_at) " +
                                "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)",
                        predictionsToSave,
                        200,
                        (ps, p) -> {
                            ps.setLong(1, p.getStudent().getId());
                            ps.setObject(2, reportIdRef, Types.BIGINT);
                            ps.setString(3, p.getRiskCategory());
                            ps.setDouble(4, p.getProbLow());
                            ps.setDouble(5, p.getProbMedium());
                            ps.setDouble(6, p.getProbHigh());
                            ps.setString(7, p.getModelName());
                            ps.setString(8, p.getModelVersion());
                            ps.setString(9, p.getFeaturesSnapshot());
                            ps.setObject(10, p.getProjectedEndPoints(), Types.DOUBLE);
                            ps.setObject(11, p.getPointsDelta(), Types.INTEGER);
                            ps.setObject(12, p.getCurrentPoints(), Types.INTEGER);
                            ps.setObject(13, p.getPercentileRank(), Types.DOUBLE);
                            ps.setString(14, p.getAnalysisMode());
                        }
                );
            }

            Set<Long> studentIdsWithContact = new HashSet<>(
                    jdbcTemplate.queryForList("SELECT DISTINCT student_id FROM emergency_contacts", Long.class)
            );
            Integer finalLimit = setting.getFinalPointLimit();
            dtoList = predictionsToSave.stream()
                    .map(p -> {
                        Student st = p.getStudent();
                        int pts = p.getCurrentPoints() != null ? p.getCurrentPoints() : 0;
                        return StudentPredictionDTO.builder()
                                .studentId(st.getId())
                                .studentNim(st.getNim())
                                .studentName(st.getFullName())
                                .studyProgram(st.getStudyProgram())
                                .faculty(st.getFaculty())
                                .residenceCategory(st.getResidenceCategory() != null ? st.getResidenceCategory().getName() : null)
                                .currentPoints(pts)
                                .pointsDelta(p.getPointsDelta() != null ? p.getPointsDelta() : 0)
                                .projectedEndPoints(p.getProjectedEndPoints())
                                .percentileRank(p.getPercentileRank() != null ? p.getPercentileRank() : 0.0)
                                .riskCategory(p.getRiskCategory())
                                .probLow(p.getProbLow())
                                .probMedium(p.getProbMedium())
                                .probHigh(p.getProbHigh())
                                .modelName(p.getModelName())
                                .modelVersion(p.getModelVersion())
                                .analysisMode(p.getAnalysisMode())
                                .exceedsFinalLimit(finalLimit != null && pts >= finalLimit)
                                .hasEmergencyContact(studentIdsWithContact.contains(st.getId()))
                                .predictedAt(now)
                                .build();
                    })
                    .sorted(Comparator.comparingInt((StudentPredictionDTO d) -> d.getCurrentPoints() != null ? d.getCurrentPoints() : 0).reversed())
                    .collect(Collectors.toList());

            if (entityManager != null) {
                entityManager.clear();
            }
        } else {
            studentRepository.saveAll(studentsToUpdate);
            if (!recordsToUpdate.isEmpty()) {
                pointRecordRepository.saveAll(recordsToUpdate);
            }
            List<MLPrediction> saved = predictionRepository.saveAll(predictionsToSave);
            dtoList = saved.stream()
                    .map(p -> StudentPredictionDTO.fromEntity(p, setting.getFinalPointLimit()))
                    .sorted(Comparator.comparingInt((StudentPredictionDTO d) -> d.getCurrentPoints() != null ? d.getCurrentPoints() : 0).reversed())
                    .collect(Collectors.toList());
        }

        auditLogService.log("ANALYZE_DYNAMIC_RISK", "MLPrediction", reportRef != null ? reportRef.getId() : null,
                null, modelName, "Analyzed dynamic risk for " + dtoList.size() + " active students (" + analysisMode + ")");

        return dtoList;
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> callAnalyzeService(
            Map<String, Object> requestBody,
            List<Student> activeStudents,
            SemesterSetting setting,
            LocalDate reportDate,
            Map<Long, List<Map<String, Object>>> historyByStudent) {

        String endpoint = mlServiceUrl + "/analyze-risk";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            if (mlApiKey != null && !mlApiKey.isBlank()) {
                headers.set("X-ML-API-Key", mlApiKey.trim());
            }
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);
            ResponseEntity<Map> response = restTemplate.postForEntity(endpoint, entity, Map.class);
            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception ex) {
            log.warn("ML Service unavailable at {}. Applying dynamic quantile fallback: {}", endpoint, ex.getMessage());
        }

        return calculateDynamicFallback(activeStudents, setting, reportDate, historyByStudent);
    }

    private Map<String, Object> calculateDynamicFallback(
            List<Student> students,
            SemesterSetting setting,
            LocalDate reportDate,
            Map<Long, List<Map<String, Object>>> historyByStudent) {

        List<Integer> positiveSorted = students.stream()
                .map(s -> s.getLatestSabbathPoints() != null ? s.getLatestSabbathPoints() : 0)
                .filter(p -> p > 0)
                .sorted()
                .toList();

        List<Integer> allSorted = students.stream()
                .map(s -> s.getLatestSabbathPoints() != null ? s.getLatestSabbathPoints() : 0)
                .sorted()
                .toList();

        int q33 = positiveSorted.isEmpty() ? 1 : positiveSorted.get((int) Math.floor(positiveSorted.size() * 0.35));
        int q70 = positiveSorted.isEmpty() ? 2 : positiveSorted.get((int) Math.floor(positiveSorted.size() * 0.72));

        long elapsedDays = Math.max(14, ChronoUnit.DAYS.between(setting.getSemesterStartDate(), reportDate));
        long totalDays = Math.max(elapsedDays, ChronoUnit.DAYS.between(setting.getSemesterStartDate(), setting.getAttendanceCutoffDate()));
        double ratio = setting.isAttendanceClosed() || !reportDate.isBefore(setting.getAttendanceCutoffDate())
                ? 1.0 : Math.min(2.0, (double) totalDays / elapsedDays);

        List<Map<String, Object>> results = new ArrayList<>();
        for (Student s : students) {
            int pts = s.getLatestSabbathPoints() != null ? s.getLatestSabbathPoints() : 0;
            int delta = s.getPointsDelta() != null ? s.getPointsDelta() : 0;
            double projected = pts == 0 ? 0.0 : Math.round(pts * ratio * 10.0) / 10.0;
            long le = allSorted.stream().filter(v -> v <= pts).count();
            double percentile = pts == 0 ? 0.0 : Math.round(((double) le / Math.max(1, allSorted.size())) * 1000.0) / 10.0;

            String risk;
            Map<String, Double> probs = new HashMap<>();
            if (pts == 0) {
                risk = "SAFE";
                probs.put("LOW", 0.96); probs.put("MEDIUM", 0.03); probs.put("HIGH", 0.01);
            } else if (pts >= q70) {
                risk = "HIGH";
                probs.put("LOW", 0.06); probs.put("MEDIUM", 0.20); probs.put("HIGH", 0.74);
            } else if (pts >= q33) {
                risk = "MEDIUM";
                probs.put("LOW", 0.18); probs.put("MEDIUM", 0.64); probs.put("HIGH", 0.18);
            } else {
                risk = "LOW";
                probs.put("LOW", 0.78); probs.put("MEDIUM", 0.18); probs.put("HIGH", 0.04);
            }

            Map<String, Object> r = new HashMap<>();
            r.put("student_id", s.getId());
            r.put("nim", s.getNim());
            r.put("current_points", pts);
            r.put("points_delta", delta);
            r.put("risk_category", risk);
            r.put("probabilities", probs);
            r.put("projected_end_points", projected);
            r.put("percentile_rank", percentile);
            results.add(r);
        }

        Map<String, Object> resp = new HashMap<>();
        resp.put("model_name", "DynamicQuantileFallback");
        resp.put("model_version", "2.0-fallback");
        resp.put("analysis_mode", "DYNAMIC_QUANTILE_FALLBACK");
        resp.put("results", results);
        return resp;
    }

    private String serializeSafe(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (Exception e) {
            return "{}";
        }
    }
}
