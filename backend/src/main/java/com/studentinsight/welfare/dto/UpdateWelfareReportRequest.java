package com.studentinsight.welfare.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateWelfareReportRequest {
    @NotBlank(message = "Status is required")
    private String status; // OPEN, IN_REVIEW, RESOLVED, CLOSED

    private String priority;
    private Long assignedToUserId;
    private String resolutionNotes;
}
