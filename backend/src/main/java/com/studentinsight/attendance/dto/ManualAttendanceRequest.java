package com.studentinsight.attendance.dto;

import com.studentinsight.attendance.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ManualAttendanceRequest {
    @NotNull(message = "Student ID is required")
    private Long studentId;

    @NotNull(message = "Worship Event ID is required")
    private Long worshipEventId;

    @NotNull(message = "Attendance status is required")
    private AttendanceStatus status;

    private String notes;
}
