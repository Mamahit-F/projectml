package com.studentinsight.prediction.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PredictionSummaryDTO {
    private long totalPredicted;
    private long lowRiskCount;
    private long mediumRiskCount;
    private long highRiskCount;
    private double lowRiskPercentage;
    private double mediumRiskPercentage;
    private double highRiskPercentage;
}
