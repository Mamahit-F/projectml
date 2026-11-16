package com.studentinsight.followup;

import com.studentinsight.student.Student;
import com.studentinsight.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "follow_up_records")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class FollowUpRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "conducted_by_user_id", nullable = false)
    private User conductedByUser;

    @Column(name = "counseling_date", nullable = false)
    private LocalDate counselingDate;

    @Column(name = "topics_discussed", nullable = false, columnDefinition = "TEXT")
    private String topicsDiscussed;

    @Column(name = "action_plan", nullable = false, columnDefinition = "TEXT")
    private String actionPlan;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "SCHEDULED"; // SCHEDULED, COMPLETED, FOLLOW_UP_NEEDED

    @Column(name = "evaluation_result", columnDefinition = "TEXT")
    private String evaluationResult;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
