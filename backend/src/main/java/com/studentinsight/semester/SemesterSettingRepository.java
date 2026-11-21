package com.studentinsight.semester;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface SemesterSettingRepository extends JpaRepository<SemesterSetting, Long> {
    Optional<SemesterSetting> findFirstByOrderByIdAsc();
}
