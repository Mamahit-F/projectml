package com.studentinsight.violation.dto;

import com.studentinsight.violation.ViolationPointRule;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ViolationPointRuleDTO {
    private Long id;
    private String violationType;
    private String description;
    private Integer defaultPoints;
    private boolean systemDemo;
    private Instant createdAt;

    public static ViolationPointRuleDTO fromEntity(ViolationPointRule entity) {
        return ViolationPointRuleDTO.builder()
                .id(entity.getId())
                .violationType(entity.getViolationType())
                .description(entity.getDescription())
                .defaultPoints(entity.getDefaultPoints())
                .systemDemo(entity.isSystemDemo())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
