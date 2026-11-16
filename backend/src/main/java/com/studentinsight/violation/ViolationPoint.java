package com.studentinsight.violation;

import com.studentinsight.attendance.Attendance;
import com.studentinsight.event.WorshipEvent;
import com.studentinsight.student.Student;
import com.studentinsight.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "violation_points")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViolationPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worship_event_id")
    private WorshipEvent worshipEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "attendance_id")
    private Attendance attendance;

    @Column(nullable = false)
    private Integer points;

    @Column(nullable = false, length = 255)
    private String reason;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, RESOLVED, CANCELLED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "adjusted_by_user_id")
    private User adjustedByUser;

    @Column(name = "adjustment_notes", columnDefinition = "TEXT")
    private String adjustmentNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
