package com.studentinsight.prediction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MLPredictionRepository extends JpaRepository<MLPrediction, Long> {
    List<MLPrediction> findByStudentIdOrderByPredictedAtDesc(Long studentId);
    Optional<MLPrediction> findFirstByStudentIdOrderByPredictedAtDesc(Long studentId);

    @Query(value = "SELECT DISTINCT ON (student_id) * FROM ml_predictions ORDER BY student_id, predicted_at DESC", nativeQuery = true)
    List<MLPrediction> findLatestPredictionsForAllStudents();

    @Query("SELECT COUNT(p) FROM MLPrediction p WHERE p.riskCategory = :riskCategory")
    long countByRiskCategory(@Param("riskCategory") String riskCategory);
}
