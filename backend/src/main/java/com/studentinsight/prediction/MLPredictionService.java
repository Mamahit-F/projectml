package com.studentinsight.prediction;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.studentinsight.attendance.Attendance;
import com.studentinsight.attendance.AttendanceRepository;
import com.studentinsight.attendance.AttendanceRuleService;
import com.studentinsight.attendance.AttendanceStatus;
import com.studentinsight.audit.AuditLogService;
import com.studentinsight.common.ResourceNotFoundException;
import com.studentinsight.event.WorshipEvent;
import com.studentinsight.event.WorshipEventRepository;
import com.studentinsight.prediction.dto.MLFeatureDTO;
import com.studentinsight.prediction.dto.MLPredictionResponseDTO;
import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.prediction.dto.StudentPredictionDTO;
import com.studentinsight.student.Student;
import com.studentinsight.student.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class MLPredictionService {

    private final MLPredictionRepository predictionRepository;
    private final StudentRepository studentRepository;
    private final AttendanceRepository attendanceRepository;
    private final WorshipEventRepository worshipEventRepository;
    private final AttendanceRuleService attendanceRuleService;
    private final AuditLogService auditLogService;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.ml.service-url:http://localhost:8001}")
    private String mlServiceUrl;

    @Transactional(readOnly = true)
    public Optional<StudentPredictionDTO> getLatestPrediction(Long studentId) {
        return predictionRepository.findFirstByStudentIdOrderByPredictedAtDesc(studentId)
                .map(StudentPredictionDTO::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<StudentPredictionDTO> getAllLatestPredictions() {
        return predictionRepository.findLatestPredictionsForAllStudents().stream()
                .map(StudentPredictionDTO::fromEntity)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public PredictionSummaryDTO getSummary() {
        List<MLPrediction> latest = predictionRepository.findLatestPredictionsForAllStudents();
        long total = latest.size();
        if (total == 0) {
            return PredictionSummaryDTO.builder()
                    .totalPredicted(0)
                    .lowRiskCount(0).mediumRiskCount(0).highRiskCount(0)
                    .lowRiskPercentage(0).mediumRiskPercentage(0).highRiskPercentage(0)
                    .build();
        }

        long low = latest.stream().filter(p -> "LOW".equalsIgnoreCase(p.getRiskCategory())).count();
        long med = latest.stream().filter(p -> "MEDIUM".equalsIgnoreCase(p.getRiskCategory())).count();
        long high = latest.stream().filter(p -> "HIGH".equalsIgnoreCase(p.getRiskCategory())).count();

        return PredictionSummaryDTO.builder()
                .totalPredicted(total)
                .lowRiskCount(low)
                .mediumRiskCount(med)
                .highRiskCount(high)
                .lowRiskPercentage(Math.round(((double) low / total) * 1000.0) / 10.0)
                .mediumRiskPercentage(Math.round(((double) med / total) * 1000.0) / 10.0)
                .highRiskPercentage(Math.round(((double) high / total) * 1000.0) / 10.0)
                .build();
    }

    @Transactional
    public StudentPredictionDTO predictStudentRisk(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student", "id", studentId));

        MLFeatureDTO features = extractStudentFeatures(student);

        MLPredictionResponseDTO mlResponse = callMLService(features);

        MLPrediction prediction = MLPrediction.builder()
                .student(student)
                .riskCategory(mlResponse.getRiskCategory())
                .probLow(mlResponse.getProbabilities().getOrDefault("LOW", 0.0))
                .probMedium(mlResponse.getProbabilities().getOrDefault("MEDIUM", 0.0))
                .probHigh(mlResponse.getProbabilities().getOrDefault("HIGH", 0.0))
                .modelName(mlResponse.getModelName())
                .modelVersion(mlResponse.getModelVersion())
                .featuresSnapshot(serializeFeatures(features))
                .build();

        MLPrediction saved = predictionRepository.save(prediction);
        auditLogService.log("PREDICT_STUDENT_RISK", "MLPrediction", saved.getId(), null, saved.getRiskCategory(),
                "Predicted " + saved.getRiskCategory() + " risk for student NIM: " + student.getNim());

        return StudentPredictionDTO.fromEntity(saved);
    }

    @Transactional
    public List<StudentPredictionDTO> predictAllActiveStudents() {
        List<Student> activeStudents = studentRepository.findByStatus("ACTIVE");
        List<StudentPredictionDTO> results = new ArrayList<>();

        for (Student student : activeStudents) {
            try {
                results.add(predictStudentRisk(student.getId()));
            } catch (Exception ex) {
                log.error("Failed to predict for student NIM: {}", student.getNim(), ex);
            }
        }

        return results;
    }

    public MLFeatureDTO extractStudentFeatures(Student student) {
        List<Attendance> attendances = attendanceRepository.findByStudentIdOrderByCreatedAtDesc(student.getId());

        int presentCount = 0;
        int absenceCount = 0;
        int wopPresentCount = 0;
        int wopRequiredCount = 0;

        List<WorshipEvent> allEvents = worshipEventRepository.findAll();
        int requiredAttendance = 0;

        for (WorshipEvent ev : allEvents) {
            boolean mandatory = attendanceRuleService.isMandatory(student.getResidenceCategory().getId(), ev.getEventType());
            if (mandatory) {
                requiredAttendance++;
                if (ev.getEventType().name().startsWith("WOP")) {
                    wopRequiredCount++;
                }
            }
        }

        for (Attendance att : attendances) {
            if (att.getStatus() == AttendanceStatus.PRESENT) {
                presentCount++;
                if (att.getWorshipEvent().getEventType().name().startsWith("WOP")) {
                    wopPresentCount++;
                }
            } else if (att.getStatus() == AttendanceStatus.ABSENT) {
                absenceCount++;
            }
        }

        int maxRequired = Math.max(1, requiredAttendance);
        double attendanceRate = Math.min(100.0, Math.round(((double) presentCount / maxRequired) * 1000.0) / 10.0);

        double wopAttendanceRate = wopRequiredCount > 0 ?
                Math.min(100.0, Math.round(((double) wopPresentCount / wopRequiredCount) * 1000.0) / 10.0) : 100.0;

        // Calculate consecutive absences from recent history
        int consecutiveAbsences = 0;
        for (Attendance att : attendances) {
            if (att.getStatus() == AttendanceStatus.ABSENT) {
                consecutiveAbsences++;
            } else if (att.getStatus() == AttendanceStatus.PRESENT) {
                break;
            }
        }

        return MLFeatureDTO.builder()
                .studentId(student.getId())
                .residenceCategory(student.getResidenceCategory().getCode())
                .requiredAttendance(requiredAttendance)
                .presentCount(presentCount)
                .absenceCount(absenceCount)
                .attendanceRate(attendanceRate)
                .consecutiveAbsences(consecutiveAbsences)
                .previousViolationPoints(student.getTotalViolationPoints())
                .wopAttendanceRate(wopAttendanceRate)
                .build();
    }

    private MLPredictionResponseDTO callMLService(MLFeatureDTO features) {
        String endpoint = mlServiceUrl + "/predict";
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<MLFeatureDTO> entity = new HttpEntity<>(features, headers);

            ResponseEntity<MLPredictionResponseDTO> response = restTemplate.postForEntity(
                    endpoint, entity, MLPredictionResponseDTO.class);

            if (response.getStatusCode().is2xxSuccessful() && response.getBody() != null) {
                return response.getBody();
            }
        } catch (Exception ex) {
            log.warn("ML Service unavailable at {}. Applying rule-based heuristic fallback: {}", endpoint, ex.getMessage());
        }

        // Robust Fallback (if ML service is temporarily down, core system continues seamlessly)
        return calculateFallbackRisk(features);
    }

    private MLPredictionResponseDTO calculateFallbackRisk(MLFeatureDTO f) {
        String risk;
        Map<String, Double> probs = new HashMap<>();

        if (f.getPreviousViolationPoints() >= 20 || f.getConsecutiveAbsences() >= 3 || f.getAttendanceRate() < 50.0) {
            risk = "HIGH";
            probs.put("LOW", 0.05);
            probs.put("MEDIUM", 0.20);
            probs.put("HIGH", 0.75);
        } else if (f.getPreviousViolationPoints() >= 10 || f.getConsecutiveAbsences() >= 1 || f.getAttendanceRate() < 80.0) {
            risk = "MEDIUM";
            probs.put("LOW", 0.20);
            probs.put("MEDIUM", 0.65);
            probs.put("HIGH", 0.15);
        } else {
            risk = "LOW";
            probs.put("LOW", 0.85);
            probs.put("MEDIUM", 0.12);
            probs.put("HIGH", 0.03);
        }

        return MLPredictionResponseDTO.builder()
                .riskCategory(risk)
                .probabilities(probs)
                .modelName("HeuristicRuleFallback")
                .modelVersion("1.0-fallback")
                .build();
    }

    private String serializeFeatures(MLFeatureDTO features) {
        try {
            return objectMapper.writeValueAsString(features);
        } catch (Exception e) {
            return "{}";
        }
    }
}
