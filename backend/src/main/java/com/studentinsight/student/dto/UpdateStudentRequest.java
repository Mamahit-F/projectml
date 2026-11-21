package com.studentinsight.student.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateStudentRequest {
    @NotBlank(message = "Nama lengkap wajib diisi")
    private String fullName;

    @NotBlank(message = "Program studi wajib diisi")
    private String studyProgram;

    @NotBlank(message = "Fakultas wajib diisi")
    private String faculty;

    private String phoneNumber;
    private Long residenceCategoryId;
    private String currentAddress;
    private String status = "ACTIVE";
    private Integer latestSabbathPoints;
}
