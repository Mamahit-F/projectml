package com.studentinsight.followup.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDate;

@Data
public class CreateFollowUpRequest {
    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "Counseling date is required")
    private LocalDate counselingDate;

    @NotBlank(message = "Topics discussed is required")
    private String topicsDiscussed;

    @NotBlank(message = "Action plan is required")
    private String actionPlan;

    private String status = "SCHEDULED"; // SCHEDULED, COMPLETED, FOLLOW_UP_NEEDED
    private String evaluationResult;
}
