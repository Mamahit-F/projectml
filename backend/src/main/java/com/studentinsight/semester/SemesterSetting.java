package com.studentinsight.semester;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "semester_settings")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SemesterSetting {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "semester_name", nullable = false, length = 120)
    private String semesterName;

    @Column(name = "semester_start_date", nullable = false)
    private LocalDate semesterStartDate;

    @Column(name = "attendance_cutoff_date", nullable = false)
    private LocalDate attendanceCutoffDate;

    @Column(name = "semester_end_date", nullable = false)
    private LocalDate semesterEndDate;

    @Column(name = "final_point_limit")
    private Integer finalPointLimit;

    @Column(name = "attendance_closed", nullable = false)
    @Builder.Default
    private boolean attendanceClosed = false;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
