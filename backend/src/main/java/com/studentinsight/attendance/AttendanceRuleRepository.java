package com.studentinsight.attendance;

import com.studentinsight.event.EventType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRuleRepository extends JpaRepository<AttendanceRule, Long> {
    List<AttendanceRule> findByResidenceCategoryId(Long residenceCategoryId);
    Optional<AttendanceRule> findByResidenceCategoryIdAndEventType(Long residenceCategoryId, EventType eventType);
}
