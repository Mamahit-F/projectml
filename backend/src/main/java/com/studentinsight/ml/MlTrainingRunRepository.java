package com.studentinsight.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MlTrainingRunRepository extends JpaRepository<MlTrainingRun, Long> {
    Optional<MlTrainingRun> findByRunCode(String runCode);
    List<MlTrainingRun> findAllByOrderByStartedAtDesc();
}
