package com.studentinsight.student;

import com.fasterxml.jackson.annotation.JsonManagedReference;
import com.studentinsight.emergency.EmergencyContact;
import com.studentinsight.residence.ResidenceCategory;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 20)
    private String nim;

    @Column(name = "first_name", length = 150)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "study_program", nullable = false, length = 100)
    private String studyProgram;

    @Column(nullable = false, length = 100)
    private String faculty;

    @Column(name = "phone_number", length = 25)
    private String phoneNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "residence_category_id")
    private ResidenceCategory residenceCategory;

    @Column(name = "current_address", columnDefinition = "TEXT")
    private String currentAddress;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, PROBATION, GRADUATED

    @Column(name = "qr_token", unique = true, length = 64)
    private String qrToken;

    @Column(name = "total_violation_points", nullable = false)
    @Builder.Default
    private Integer totalViolationPoints = 0;

    @Column(name = "latest_sabbath_points", nullable = false)
    @Builder.Default
    private Integer latestSabbathPoints = 0;

    @Column(name = "previous_sabbath_points")
    private Integer previousSabbathPoints;

    @Column(name = "points_delta", nullable = false)
    @Builder.Default
    private Integer pointsDelta = 0;

    @Column(name = "risk_category", nullable = false, length = 20)
    @Builder.Default
    private String riskCategory = "SAFE"; // SAFE, LOW, MEDIUM, HIGH

    @Column(name = "projected_end_points")
    private Double projectedEndPoints;

    @OneToMany(mappedBy = "student", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonManagedReference
    @Builder.Default
    private List<EmergencyContact> emergencyContacts = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}
