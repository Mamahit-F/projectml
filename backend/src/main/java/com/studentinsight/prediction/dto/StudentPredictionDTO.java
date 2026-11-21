package com.studentinsight.prediction.dto;

import com.studentinsight.prediction.MLPrediction;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentPredictionDTO {
    private Long id;
    private Long studentId;
    private String studentNim;
    private String studentName;
    private String studyProgram;
    private String faculty;
    private String residenceCategory;
    private Integer currentPoints;
    private Integer pointsDelta;
    private Double projectedEndPoints;
    private Double percentileRank;
    private String riskCategory; // SAFE, LOW, MEDIUM, HIGH
    private Double probLow;
    private Double probMedium;
    private Double probHigh;
    private String modelName;
    private String modelVersion;
    private String analysisMode;
    private boolean exceedsFinalLimit;
    private boolean hasEmergencyContact;
    private Instant predictedAt;

    public static StudentPredictionDTO fromEntity(MLPrediction p, Integer finalPointLimit) {
        int pts = p.getCurrentPoints() != null ? p.getCurrentPoints()
                : (p.getStudent() != null ? p.getStudent().getLatestSabbathPoints() : 0);
        boolean exceeds = finalPointLimit != null && pts >= finalPointLimit;
        boolean hasContact = p.getStudent() != null
                && p.getStudent().getEmergencyContacts() != null
                && !p.getStudent().getEmergencyContacts().isEmpty();

        return StudentPredictionDTO.builder()
                .id(p.getId())
                .studentId(p.getStudent() != null ? p.getStudent().getId() : null)
                .studentNim(p.getStudent() != null ? p.getStudent().getNim() : null)
                .studentName(p.getStudent() != null ? p.getStudent().getFullName() : null)
                .studyProgram(p.getStudent() != null ? p.getStudent().getStudyProgram() : null)
                .faculty(p.getStudent() != null ? p.getStudent().getFaculty() : null)
                .residenceCategory(p.getStudent() != null && p.getStudent().getResidenceCategory() != null
                        ? p.getStudent().getResidenceCategory().getName() : null)
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
                .exceedsFinalLimit(exceeds)
                .hasEmergencyContact(hasContact)
                .predictedAt(p.getPredictedAt())
                .build();
    }
}
