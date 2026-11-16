package com.studentinsight.violation;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ViolationPointRuleRepository extends JpaRepository<ViolationPointRule, Long> {
    Optional<ViolationPointRule> findByViolationType(String violationType);
}
