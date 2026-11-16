package com.studentinsight.followup;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FollowUpRecordRepository extends JpaRepository<FollowUpRecord, Long> {
    List<FollowUpRecord> findByStudentIdOrderByCounselingDateDesc(Long studentId);
    List<FollowUpRecord> findByStatus(String status);
    long countByStatus(String status);
}
