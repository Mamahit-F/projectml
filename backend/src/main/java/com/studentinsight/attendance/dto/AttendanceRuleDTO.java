package com.studentinsight.attendance.dto;

import com.studentinsight.attendance.AttendanceRule;
import com.studentinsight.event.EventType;
import com.studentinsight.residence.dto.ResidenceCategoryDTO;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRuleDTO {
    private Long id;
    private ResidenceCategoryDTO residenceCategory;
    private EventType eventType;
    private boolean mandatory;
    private Integer pointPenaltyWeight;
    private String notes;
    private boolean active;
    private Instant createdAt;

    public static AttendanceRuleDTO fromEntity(AttendanceRule entity) {
        return AttendanceRuleDTO.builder()
                .id(entity.getId())
                .residenceCategory(ResidenceCategoryDTO.fromEntity(entity.getResidenceCategory()))
                .eventType(entity.getEventType())
                .mandatory(entity.isMandatory())
                .pointPenaltyWeight(entity.getPointPenaltyWeight())
                .notes(entity.getNotes())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
