package com.studentinsight.welfare;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WelfareReportRepository extends JpaRepository<WelfareReport, Long> {
    List<WelfareReport> findByStudentIdOrderByCreatedAtDesc(Long studentId);
    List<WelfareReport> findByStatus(String status);

    @Query("SELECT r FROM WelfareReport r WHERE " +
           "(:status IS NULL OR r.status = :status) AND " +
           "(:priority IS NULL OR r.priority = :priority) AND " +
           "(:reportType IS NULL OR r.reportType = :reportType) " +
           "ORDER BY r.createdAt DESC")
    Page<WelfareReport> searchReports(@Param("status") String status,
                                      @Param("priority") String priority,
                                      @Param("reportType") String reportType,
                                      Pageable pageable);

    long countByStatus(String status);
}
