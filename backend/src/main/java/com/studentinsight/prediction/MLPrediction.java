package com.studentinsight.prediction;

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

    @Column(name = "risk_category", nullable = false, length = 20)
    private String riskCategory; // LOW, MEDIUM, HIGH

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

    @CreationTimestamp
    @Column(name = "predicted_at", nullable = false, updatable = false)
    private Instant predictedAt;
}
