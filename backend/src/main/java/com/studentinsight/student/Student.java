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

    @Column(name = "full_name", nullable = false, length = 150)
    private String fullName;

    @Column(name = "study_program", nullable = false, length = 100)
    private String studyProgram;

    @Column(nullable = false, length = 100)
    private String faculty;

    @Column(name = "phone_number", length = 25)
    private String phoneNumber;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "residence_category_id", nullable = false)
    private ResidenceCategory residenceCategory;

    @Column(name = "current_address", nullable = false, columnDefinition = "TEXT")
    private String currentAddress;

    @Column(nullable = false, length = 30)
    @Builder.Default
    private String status = "ACTIVE"; // ACTIVE, INACTIVE, PROBATION, GRADUATED

    @Column(name = "qr_token", nullable = false, unique = true, length = 64)
    private String qrToken;

    @Column(name = "total_violation_points", nullable = false)
    @Builder.Default
    private Integer totalViolationPoints = 0;

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
