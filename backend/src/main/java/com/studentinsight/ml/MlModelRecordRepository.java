package com.studentinsight.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MlModelRecordRepository extends JpaRepository<MlModelRecord, Long> {
    Optional<MlModelRecord> findByModelId(String modelId);
    List<MlModelRecord> findByModelType(String modelType);
    List<MlModelRecord> findAllByOrderByTrainedAtDesc();
}
