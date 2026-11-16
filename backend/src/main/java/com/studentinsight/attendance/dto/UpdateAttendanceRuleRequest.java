package com.studentinsight.attendance.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateAttendanceRuleRequest {
    @NotNull(message = "Mandatory flag is required")
    private Boolean mandatory;

    @NotNull(message = "Point penalty weight is required")
    @Min(value = 0, message = "Penalty weight cannot be negative")
    private Integer pointPenaltyWeight;

    private String notes;
    private Boolean active;
}
