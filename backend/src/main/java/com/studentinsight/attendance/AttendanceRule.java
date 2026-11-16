package com.studentinsight.attendance;

import com.studentinsight.event.EventType;
import com.studentinsight.residence.ResidenceCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "attendance_rules", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"residence_category_id", "event_type"})
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "residence_category_id", nullable = false)
    private ResidenceCategory residenceCategory;

    @Enumerated(EnumType.STRING)
    @Column(name = "event_type", nullable = false, length = 50)
    private EventType eventType;

    @Column(name = "is_mandatory", nullable = false)
    @Builder.Default
    private boolean mandatory = true;

    @Column(name = "point_penalty_weight", nullable = false)
    @Builder.Default
    private Integer pointPenaltyWeight = 5;

    @Column(length = 255)
    private String notes;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
