package com.studentinsight.pdfreport;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface StudentPointRecordRepository extends JpaRepository<StudentPointRecord, Long> {

    List<StudentPointRecord> findByPdfReportIdOrderBySabbathPointsDescRowNumberAsc(Long pdfReportId);

    @Query("SELECT r FROM StudentPointRecord r JOIN r.student s WHERE r.pdfReport.id = :reportId AND " +
           "(:search IS NULL OR CAST(:search AS string) = '' OR LOWER(s.nim) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) " +
           " OR LOWER(s.fullName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) AND " +
           "(:studyProgram IS NULL OR CAST(:studyProgram AS string) = '' OR LOWER(s.studyProgram) = LOWER(CAST(:studyProgram AS string))) AND " +
           "(:riskCategory IS NULL OR CAST(:riskCategory AS string) = '' OR UPPER(r.riskCategory) = UPPER(CAST(:riskCategory AS string)))")
    Page<StudentPointRecord> searchByReport(@Param("reportId") Long reportId,
                                            @Param("search") String search,
                                            @Param("studyProgram") String studyProgram,
                                            @Param("riskCategory") String riskCategory,
                                            Pageable pageable);

    @Query("SELECT r FROM StudentPointRecord r JOIN FETCH r.pdfReport p WHERE r.student.id = :studentId ORDER BY p.reportDate ASC, p.createdAt ASC")
    List<StudentPointRecord> findHistoryByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT r FROM StudentPointRecord r JOIN FETCH r.pdfReport p WHERE r.student.id IN :studentIds ORDER BY r.student.id ASC, p.reportDate ASC, p.createdAt ASC")
    List<StudentPointRecord> findHistoryByStudentIdIn(@Param("studentIds") Collection<Long> studentIds);

    @Query("SELECT r FROM StudentPointRecord r JOIN FETCH r.pdfReport p ORDER BY p.reportDate ASC, p.createdAt ASC")
    List<StudentPointRecord> findAllWithReportOrdered();

    Optional<StudentPointRecord> findByPdfReportIdAndStudentId(Long pdfReportId, Long studentId);

    @Query("SELECT DISTINCT r.student.id FROM StudentPointRecord r WHERE r.pdfReport.id = :reportId")
    List<Long> findDistinctStudentIdsByPdfReportId(@Param("reportId") Long reportId);

    @Query("SELECT DISTINCT r.student.id FROM StudentPointRecord r")
    List<Long> findAllStudentIdsWithRecords();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("DELETE FROM StudentPointRecord r WHERE r.pdfReport.id = :pdfReportId")
    void deleteByPdfReportId(@Param("pdfReportId") Long pdfReportId);
}
