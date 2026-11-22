package com.studentinsight.prediction;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface MLPredictionRepository extends JpaRepository<MLPrediction, Long> {
    List<MLPrediction> findByStudentIdOrderByPredictedAtDesc(Long studentId);
    Optional<MLPrediction> findFirstByStudentIdOrderByPredictedAtDescIdDesc(Long studentId);

    @Query(value = "SELECT DISTINCT ON (student_id) * FROM ml_predictions ORDER BY student_id, predicted_at DESC, id DESC", nativeQuery = true)
    List<MLPrediction> findLatestPredictionsForAllStudents();

    void deleteByPdfReportId(Long pdfReportId);

    void deleteByStudentIdIn(Collection<Long> studentIds);
}
