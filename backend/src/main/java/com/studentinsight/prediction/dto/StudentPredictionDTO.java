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
    private String residenceCategory;
    private Integer totalViolationPoints;
    private String riskCategory;
    private Double probLow;
    private Double probMedium;
    private Double probHigh;
    private String modelName;
    private String modelVersion;
    private String featuresSnapshot;
    private Instant predictedAt;

    public static StudentPredictionDTO fromEntity(MLPrediction entity) {
        return StudentPredictionDTO.builder()
                .id(entity.getId())
                .studentId(entity.getStudent().getId())
                .studentNim(entity.getStudent().getNim())
                .studentName(entity.getStudent().getFullName())
                .residenceCategory(entity.getStudent().getResidenceCategory() != null ? entity.getStudent().getResidenceCategory().getCode() : null)
                .totalViolationPoints(entity.getStudent().getTotalViolationPoints())
                .riskCategory(entity.getRiskCategory())
                .probLow(entity.getProbLow())
                .probMedium(entity.getProbMedium())
                .probHigh(entity.getProbHigh())
                .modelName(entity.getModelName())
                .modelVersion(entity.getModelVersion())
                .featuresSnapshot(entity.getFeaturesSnapshot())
                .predictedAt(entity.getPredictedAt())
                .build();
    }
}
