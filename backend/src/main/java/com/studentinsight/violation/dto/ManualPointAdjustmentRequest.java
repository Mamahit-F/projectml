package com.studentinsight.violation.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ManualPointAdjustmentRequest {
    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "Points value is required (can be positive or negative for reduction)")
    private Integer points;

    @NotBlank(message = "Reason is required")
    private String reason;

    @NotBlank(message = "Adjustment notes / explanation is required")
    private String adjustmentNotes;
}
