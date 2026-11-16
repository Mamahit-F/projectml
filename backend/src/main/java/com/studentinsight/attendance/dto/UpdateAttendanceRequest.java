package com.studentinsight.attendance.dto;

import com.studentinsight.attendance.AttendanceStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateAttendanceRequest {
    @NotNull(message = "Attendance status is required")
    private AttendanceStatus status;

    @NotBlank(message = "Reason / correction notes are required")
    private String notes;
}
