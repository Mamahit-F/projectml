package com.studentinsight.dashboard.dto;

import com.studentinsight.prediction.dto.PredictionSummaryDTO;
import com.studentinsight.student.dto.StudentDTO;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DashboardOverviewDTO {
    private long totalStudents;
    private long zeroPointStudents;
    private long studentsWithPoints;
    private int maxPoints;
    private double avgPoints;
    private double medianPoints;
    private long totalPdfReports;
    private long openWelfareReports;
    private long activeFollowUps;
    private long emergencyContactsCount;

    private Map<String, Object> latestPdfReport;
    private Map<String, Object> semesterSetting;
    private PredictionSummaryDTO predictionSummary;

    private List<ProdiStat> prodiBreakdown;
    private Map<String, Long> pointDistribution;
    private List<SnapshotTrendItem> snapshotTrend;
    private List<StudentDTO> priorityStudents;
    private List<Map<String, Object>> recentActivities;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ProdiStat {
        private String studyProgram;
        private long totalStudents;
        private long zeroPointStudents;
        private long studentsWithPoints;
        private long highRiskCount;
        private double avgPoints;
        private int maxPoints;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SnapshotTrendItem {
        private Long reportId;
        private LocalDate reportDate;
        private String periodLabel;
        private int totalStudents;
        private int studentsWithPoints;
        private double avgPoints;
        private int maxPoints;
    }
}
