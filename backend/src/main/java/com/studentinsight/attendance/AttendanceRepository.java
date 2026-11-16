package com.studentinsight.attendance;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    Optional<Attendance> findByStudentIdAndWorshipEventId(Long studentId, Long worshipEventId);
    boolean existsByStudentIdAndWorshipEventId(Long studentId, Long worshipEventId);
    List<Attendance> findByWorshipEventId(Long worshipEventId);
    List<Attendance> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    @Query("SELECT a FROM Attendance a WHERE " +
           "(:worshipEventId IS NULL OR a.worshipEvent.id = :worshipEventId) AND " +
           "(:studentId IS NULL OR a.student.id = :studentId) AND " +
           "(:status IS NULL OR a.status = :status)")
    Page<Attendance> searchAttendances(@Param("worshipEventId") Long worshipEventId,
                                       @Param("studentId") Long studentId,
                                       @Param("status") AttendanceStatus status,
                                       Pageable pageable);

    long countByStatus(AttendanceStatus status);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.student.id = :studentId AND a.status = :status")
    long countByStudentIdAndStatus(@Param("studentId") Long studentId, @Param("status") AttendanceStatus status);

    @Query("SELECT COUNT(a) FROM Attendance a WHERE a.student.id = :studentId")
    long countByStudentId(@Param("studentId") Long studentId);
}
