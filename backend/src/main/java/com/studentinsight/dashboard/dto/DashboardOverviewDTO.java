package com.studentinsight.dashboard.dto;

import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.student.dto.StudentDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardOverviewDTO {
    private long totalStudents;
    private long outsiderDekatCount;
    private long outsiderJauhCount;
    private long totalWorshipEvents;
    private long ongoingEvents;
    private long completedEvents;

    // Attendance stats
    private long totalAttendances;
    private long presentCount;
    private long absentCount;
    private long excusedCount;
    private long sickCount;
    private double overallAttendanceRate;

    // Violations stats
    private long studentsWithViolations;
    private long totalActiveViolationPoints;
    private Map<String, Long> violationDistribution; // e.g. "0-5 pts", "6-15 pts", "16-30 pts", ">30 pts"

    // ML Predictions stats
    private PredictionSummaryDTO predictionSummary;

    // Attention needed list (high points or high risk)
    private List<StudentDTO> studentsNeedingEvaluation;
}
