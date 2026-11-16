package com.studentinsight.student.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateStudentRequest {
    @NotBlank(message = "NIM is required")
    private String nim;

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

    private String status = "ACTIVE";

    // Emergency Contact Initial Info
    private String emergencyContactName;
    private String emergencyRelationship;
    private String emergencyPhone;
    private String emergencyAddress;
}
