package com.studentinsight.prediction.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MLFeatureDTO {
    @JsonProperty("student_id")
    private Long studentId;

    @JsonProperty("residence_category")
    private String residenceCategory; // OUTSIDER_DEKAT or OUTSIDER_JAUH

    @JsonProperty("required_attendance")
    private Integer requiredAttendance;

    @JsonProperty("present_count")
    private Integer presentCount;

    @JsonProperty("absence_count")
    private Integer absenceCount;

    @JsonProperty("attendance_rate")
    private Double attendanceRate;

    @JsonProperty("consecutive_absences")
    private Integer consecutiveAbsences;

    @JsonProperty("previous_violation_points")
    private Integer previousViolationPoints;

    @JsonProperty("wop_attendance_rate")
    private Double wopAttendanceRate;
}
