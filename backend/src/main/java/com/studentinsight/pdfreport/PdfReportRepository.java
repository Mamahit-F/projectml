package com.studentinsight.pdfreport;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PdfReportRepository extends JpaRepository<PdfReport, Long> {
    List<PdfReport> findAllByOrderByReportDateDescCreatedAtDesc();
    List<PdfReport> findAllByOrderByReportDateAscCreatedAtAsc();
    Optional<PdfReport> findFirstByOrderByReportDateDescCreatedAtDesc();
}
