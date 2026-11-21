package com.studentinsight.pdfreport;

import com.studentinsight.student.Student;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "student_point_records",
       uniqueConstraints = @UniqueConstraint(name = "uq_pdf_student", columnNames = {"pdf_report_id", "student_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class StudentPointRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "pdf_report_id", nullable = false)
    private PdfReport pdfReport;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "row_number")
    private Integer rowNumber;

    @Column(name = "sabbath_points", nullable = false)
    @Builder.Default
    private Integer sabbathPoints = 0;

    @Column(name = "points_delta", nullable = false)
    @Builder.Default
    private Integer pointsDelta = 0;

    @Column(name = "risk_category", nullable = false, length = 20)
    @Builder.Default
    private String riskCategory = "SAFE";

    @Column(name = "projected_end_points")
    private Double projectedEndPoints;

    @Column(name = "percentile_rank")
    private Double percentileRank;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
