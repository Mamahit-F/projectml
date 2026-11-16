package com.studentinsight.welfare.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateWelfareReportRequest {
    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotBlank(message = "Report type is required")
    private String reportType; // HOUSING, SECURITY, FINANCIAL, HEALTH, GENERAL_AID

    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    @NotBlank(message = "Description is required")
    private String description;

    private Long assignedToUserId;
}
