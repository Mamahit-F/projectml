package com.studentinsight.ml;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "ml_models")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlModelRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "model_id", nullable = false, unique = true, length = 120)
    private String modelId;

    @Column(name = "run_code", length = 80)
    private String runCode;

    @Column(name = "dataset_version_code", length = 80)
    private String datasetVersionCode;

    @Column(name = "model_name", nullable = false, length = 120)
    private String modelName;

    @Column(name = "model_type", nullable = false, length = 30)
    private String modelType;

    @Column(nullable = false, length = 80)
    private String algorithm;

    @Column(nullable = false, length = 30)
    private String version;

    @Column(name = "artifact_path", columnDefinition = "TEXT")
    private String artifactPath;

    @Column(name = "target_definition", columnDefinition = "TEXT")
    private String targetDefinition;

    @Column(name = "features_json", columnDefinition = "TEXT")
    private String featuresJson;

    @Column(name = "parameters_json", columnDefinition = "TEXT")
    private String parametersJson;

    @Column(name = "evaluation_metrics_json", columnDefinition = "TEXT")
    private String evaluationMetricsJson;

    @Column(nullable = false)
    @Builder.Default
    private boolean adequate = true;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "CANDIDATE";

    @Column(name = "is_selected", nullable = false)
    @Builder.Default
    private boolean selected = false;

    @Column(name = "selection_reason", columnDefinition = "TEXT")
    private String selectionReason;

    @Column(name = "selection_notes", columnDefinition = "TEXT")
    private String selectionNotes;

    @CreationTimestamp
    @Column(name = "trained_at", nullable = false, updatable = false)
    private Instant trainedAt;

    @Column(name = "selected_at")
    private Instant selectedAt;
}
