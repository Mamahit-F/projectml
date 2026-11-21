package com.studentinsight.pdfreport;

import com.studentinsight.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "pdf_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PdfReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "faculty_name", nullable = false, length = 150)
    private String facultyName;

    @Column(name = "report_date", nullable = false)
    private LocalDate reportDate;

    @Column(name = "period_label", length = 120)
    private String periodLabel;

    @Column(name = "total_students", nullable = false)
    @Builder.Default
    private Integer totalStudents = 0;

    @Column(name = "zero_point_students", nullable = false)
    @Builder.Default
    private Integer zeroPointStudents = 0;

    @Column(name = "students_with_points", nullable = false)
    @Builder.Default
    private Integer studentsWithPoints = 0;

    @Column(name = "max_points", nullable = false)
    @Builder.Default
    private Integer maxPoints = 0;

    @Column(name = "avg_points", nullable = false)
    @Builder.Default
    private Double avgPoints = 0.0;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_user_id")
    private User uploadedByUser;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
