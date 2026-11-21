package com.studentinsight.prediction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionSummaryDTO {
    private long totalPredicted;
    private long safeCount;
    private long lowRiskCount;
    private long mediumRiskCount;
    private long highRiskCount;
    private double safePercentage;
    private double lowRiskPercentage;
    private double mediumRiskPercentage;
    private double highRiskPercentage;
    private long exceedsFinalLimitCount;
    private String analysisMode;
    private String modelName;
    private LocalDate latestReportDate;
    private LocalDate attendanceCutoffDate;
    private Integer finalPointLimit;
    private boolean attendanceClosed;
    private Map<String, Map<String, Integer>> clusterRanges;
}
