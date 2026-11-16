package com.studentinsight.attendance;

import com.studentinsight.event.WorshipEvent;
import com.studentinsight.student.Student;
import com.studentinsight.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "attendances", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"student_id", "worship_event_id"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "worship_event_id", nullable = false)
    private WorshipEvent worshipEvent;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AttendanceStatus status;

    @Enumerated(EnumType.STRING)
    @Column(name = "recorded_method", nullable = false, length = 20)
    @Builder.Default
    private AttendanceMethod recordedMethod = AttendanceMethod.MANUAL_INPUT;

    @Column(name = "check_in_time")
    private Instant checkInTime;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by_user_id")
    private User verifiedByUser;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
