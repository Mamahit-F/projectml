package com.studentinsight.followup.dto;

import com.studentinsight.followup.FollowUpRecord;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FollowUpDTO {
    private Long id;
    private Long studentId;
    private String studentNim;
    private String studentName;
    private String studentResidenceCode;
    private Integer totalViolationPoints;
    private Long conductedByUserId;
    private String conductedByUserName;
    private LocalDate counselingDate;
    private String topicsDiscussed;
    private String actionPlan;
    private String status;
    private String evaluationResult;
    private Instant createdAt;

    public static FollowUpDTO fromEntity(FollowUpRecord entity) {
        return FollowUpDTO.builder()
                .id(entity.getId())
                .studentId(entity.getStudent().getId())
                .studentNim(entity.getStudent().getNim())
                .studentName(entity.getStudent().getFullName())
                .studentResidenceCode(entity.getStudent().getResidenceCategory() != null ? entity.getStudent().getResidenceCategory().getCode() : null)
                .totalViolationPoints(entity.getStudent().getTotalViolationPoints())
                .conductedByUserId(entity.getConductedByUser().getId())
                .conductedByUserName(entity.getConductedByUser().getFullName())
                .counselingDate(entity.getCounselingDate())
                .topicsDiscussed(entity.getTopicsDiscussed())
                .actionPlan(entity.getActionPlan())
                .status(entity.getStatus())
                .evaluationResult(entity.getEvaluationResult())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
