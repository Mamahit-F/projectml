package com.studentinsight.violation;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ViolationPointRepository extends JpaRepository<ViolationPoint, Long> {
    Page<ViolationPoint> findAllByOrderByCreatedAtDesc(Pageable pageable);
    Page<ViolationPoint> findByStudentIdOrderByCreatedAtDesc(Long studentId, Pageable pageable);
    List<ViolationPoint> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    Optional<ViolationPoint> findByAttendanceId(Long attendanceId);

    @Query("SELECT COALESCE(SUM(v.points), 0) FROM ViolationPoint v WHERE v.student.id = :studentId AND v.status = 'ACTIVE'")
    int sumActivePointsByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT COUNT(DISTINCT v.student.id) FROM ViolationPoint v WHERE v.status = 'ACTIVE' AND v.points > 0")
    long countStudentsWithViolations();

    long countByStatus(String status);
}
