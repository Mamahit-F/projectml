package com.studentinsight.violation;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;

@Entity
@Table(name = "violation_point_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ViolationPointRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "violation_type", nullable = false, unique = true, length = 50)
    private String violationType;

    @Column(nullable = false, length = 255)
    private String description;

    @Column(name = "default_points", nullable = false)
    private Integer defaultPoints;

    @Column(name = "is_system_demo", nullable = false)
    @Builder.Default
    private boolean systemDemo = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
