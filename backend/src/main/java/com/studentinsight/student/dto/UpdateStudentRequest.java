package com.studentinsight.student.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStudentRequest {
    @NotBlank(message = "Full name is required")
    private String fullName;

    @NotBlank(message = "Study program is required")
    private String studyProgram;

    @NotBlank(message = "Faculty is required")
    private String faculty;

    private String phoneNumber;

    @NotNull(message = "Residence category ID is required")
    private Long residenceCategoryId;

    @NotBlank(message = "Current address is required")
    private String currentAddress;

    @NotBlank(message = "Status is required")
    private String status;
}
