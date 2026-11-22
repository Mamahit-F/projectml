package com.studentinsight.ml;

import com.studentinsight.student.Student;
import com.studentinsight.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "ml_prediction_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlPredictionLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "dataset_version_code", length = 80)
    private String datasetVersionCode;

    @Column(name = "regression_model_id", length = 120)
    private String regressionModelId;

    @Column(name = "classification_model_id", length = 120)
    private String classificationModelId;

    @Column(name = "internal_student_id", nullable = false, length = 40)
    private String internalStudentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id")
    private Student student;

    @Column(length = 30)
    private String nim;

    @Column(name = "predicted_next_points")
    private Double predictedNextPoints;

    @Column(name = "predicted_category", length = 30)
    private String predictedCategory;

    private Double confidence;

    @Column(name = "probabilities_json", columnDefinition = "TEXT")
    private String probabilitiesJson;

    @Column(name = "features_used_json", columnDefinition = "TEXT")
    private String featuresUsedJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requested_by_user_id")
    private User requestedByUser;

    @CreationTimestamp
    @Column(name = "predicted_at", nullable = false, updatable = false)
    private Instant predictedAt;
}
