package com.studentinsight.prediction;

import com.studentinsight.pdfreport.PdfReport;
import com.studentinsight.student.Student;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "ml_predictions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MLPrediction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pdf_report_id")
    private PdfReport pdfReport;

    @Column(name = "risk_category", nullable = false, length = 20)
    private String riskCategory; // SAFE, LOW, MEDIUM, HIGH

    @Column(name = "prob_low", nullable = false)
    private Double probLow;

    @Column(name = "prob_medium", nullable = false)
    private Double probMedium;

    @Column(name = "prob_high", nullable = false)
    private Double probHigh;

    @Column(name = "model_name", nullable = false, length = 50)
    private String modelName;

    @Column(name = "model_version", nullable = false, length = 30)
    private String modelVersion;

    @Column(name = "features_snapshot", nullable = false, columnDefinition = "TEXT")
    private String featuresSnapshot;

    @Column(name = "projected_end_points")
    private Double projectedEndPoints;

    @Column(name = "points_delta")
    @Builder.Default
    private Integer pointsDelta = 0;

    @Column(name = "current_points")
    @Builder.Default
    private Integer currentPoints = 0;

    @Column(name = "percentile_rank")
    @Builder.Default
    private Double percentileRank = 0.0;

    @Column(name = "analysis_mode", length = 50)
    @Builder.Default
    private String analysisMode = "DYNAMIC_KMEANS_CLUSTERING";

    @CreationTimestamp
    @Column(name = "predicted_at", nullable = false, updatable = false)
    private Instant predictedAt;
}
