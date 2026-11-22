package com.studentinsight.ml;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MlDatasetVersionRepository extends JpaRepository<MlDatasetVersion, Long> {
    Optional<MlDatasetVersion> findByVersionCode(String versionCode);
    List<MlDatasetVersion> findAllByOrderByCreatedAtDesc();
}
