package com.studentinsight.prediction.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MLPredictionResponseDTO {
    @JsonProperty("risk_category")
    private String riskCategory; // LOW, MEDIUM, HIGH

    @JsonProperty("probabilities")
    private Map<String, Double> probabilities;

    @JsonProperty("model_name")
    private String modelName;

    @JsonProperty("model_version")
    private String modelVersion;
}
