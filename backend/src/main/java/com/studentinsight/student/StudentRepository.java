package com.studentinsight.student;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {
    Optional<Student> findByNim(String nim);
    Optional<Student> findByQrToken(String qrToken);
    boolean existsByNim(String nim);
    List<Student> findByStatus(String status);
    List<Student> findByResidenceCategoryId(Long residenceCategoryId);

    @Query("SELECT s FROM Student s WHERE " +
           "(:search IS NULL OR CAST(:search AS string) = '' OR LOWER(s.nim) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%')) OR LOWER(s.fullName) LIKE LOWER(CONCAT('%', CAST(:search AS string), '%'))) AND " +
           "(:residenceCategoryId IS NULL OR s.residenceCategory.id = :residenceCategoryId) AND " +
           "(:status IS NULL OR CAST(:status AS string) = '' OR s.status = CAST(:status AS string))")
    Page<Student> searchStudents(@Param("search") String search,
                                 @Param("residenceCategoryId") Long residenceCategoryId,
                                 @Param("status") String status,
                                 Pageable pageable);

    long countByResidenceCategoryId(Long residenceCategoryId);
    long countByStatus(String status);
}
