package com.studentinsight.welfare.dto;

import com.studentinsight.welfare.WelfareReport;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class WelfareReportDTO {
    private Long id;
    private Long studentId;
    private String studentNim;
    private String studentName;
    private String studentResidenceCode;
    private String reportType;
    private String priority;
    private String status;
    private String description;
    private String reportedByName;
    private String assignedToName;
    private String resolutionNotes;
    private Instant createdAt;

    public static WelfareReportDTO fromEntity(WelfareReport entity) {
        return WelfareReportDTO.builder()
                .id(entity.getId())
                .studentId(entity.getStudent().getId())
                .studentNim(entity.getStudent().getNim())
                .studentName(entity.getStudent().getFullName())
                .studentResidenceCode(entity.getStudent().getResidenceCategory() != null ? entity.getStudent().getResidenceCategory().getCode() : null)
                .reportType(entity.getReportType())
                .priority(entity.getPriority())
                .status(entity.getStatus())
                .description(entity.getDescription())
                .reportedByName(entity.getReportedByUser() != null ? entity.getReportedByUser().getFullName() : null)
                .assignedToName(entity.getAssignedToUser() != null ? entity.getAssignedToUser().getFullName() : null)
                .resolutionNotes(entity.getResolutionNotes())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
