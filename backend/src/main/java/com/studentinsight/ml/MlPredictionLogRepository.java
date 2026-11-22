package com.studentinsight.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MlPredictionLogRepository extends JpaRepository<MlPredictionLog, Long> {
    List<MlPredictionLog> findTop50ByOrderByPredictedAtDesc();
    List<MlPredictionLog> findByNimOrderByPredictedAtDesc(String nim);
}
