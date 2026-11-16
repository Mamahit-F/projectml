package com.studentinsight.welfare;

import com.studentinsight.student.Student;
import com.studentinsight.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "welfare_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WelfareReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @Column(name = "report_type", nullable = false, length = 50)
    private String reportType; // HOUSING, SECURITY, FINANCIAL, HEALTH, GENERAL_AID

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String priority = "MEDIUM"; // LOW, MEDIUM, HIGH, URGENT

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "OPEN"; // OPEN, IN_REVIEW, RESOLVED, CLOSED

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by_user_id")
    private User reportedByUser;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_user_id")
    private User assignedToUser;

    @Column(name = "resolution_notes", columnDefinition = "TEXT")
    private String resolutionNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
