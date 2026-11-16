package com.studentinsight.violation.dto;

import com.studentinsight.violation.ViolationPoint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViolationPointDTO {
    private Long id;
    private Long studentId;
    private String studentNim;
    private String studentName;
    private Long worshipEventId;
    private String worshipEventTitle;
    private Long attendanceId;
    private Integer points;
    private String reason;
    private String status;
    private String adjustedBy;
    private String adjustmentNotes;
    private Instant createdAt;

    public static ViolationPointDTO fromEntity(ViolationPoint entity) {
        return ViolationPointDTO.builder()
                .id(entity.getId())
                .studentId(entity.getStudent().getId())
                .studentNim(entity.getStudent().getNim())
                .studentName(entity.getStudent().getFullName())
                .worshipEventId(entity.getWorshipEvent() != null ? entity.getWorshipEvent().getId() : null)
                .worshipEventTitle(entity.getWorshipEvent() != null ? entity.getWorshipEvent().getTitle() : null)
                .attendanceId(entity.getAttendance() != null ? entity.getAttendance().getId() : null)
                .points(entity.getPoints())
                .reason(entity.getReason())
                .status(entity.getStatus())
                .adjustedBy(entity.getAdjustedByUser() != null ? entity.getAdjustedByUser().getFullName() : null)
                .adjustmentNotes(entity.getAdjustmentNotes())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
