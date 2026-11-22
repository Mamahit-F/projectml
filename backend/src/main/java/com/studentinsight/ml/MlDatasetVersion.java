package com.studentinsight.ml;

import com.studentinsight.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.Instant;

@Entity
@Table(name = "ml_dataset_versions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MlDatasetVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "version_code", nullable = false, unique = true, length = 80)
    private String versionCode;

    @Column(name = "dataset_fingerprint", nullable = false, length = 64)
    private String datasetFingerprint;

    @Column(name = "source_directory", nullable = false, columnDefinition = "TEXT")
    private String sourceDirectory;

    @Column(name = "folders_scanned", nullable = false)
    @Builder.Default
    private Integer foldersScanned = 0;

    @Column(name = "files_total", nullable = false)
    @Builder.Default
    private Integer filesTotal = 0;

    @Column(name = "files_succeeded", nullable = false)
    @Builder.Default
    private Integer filesSucceeded = 0;

    @Column(name = "files_failed", nullable = false)
    @Builder.Default
    private Integer filesFailed = 0;

    @Column(name = "total_records", nullable = false)
    @Builder.Default
    private Integer totalRecords = 0;

    @Column(name = "unique_students", nullable = false)
    @Builder.Default
    private Integer uniqueStudents = 0;

    @Column(name = "verified_students", nullable = false)
    @Builder.Default
    private Integer verifiedStudents = 0;

    @Column(name = "uncertain_identities", nullable = false)
    @Builder.Default
    private Integer uncertainIdentities = 0;

    @Column(name = "quality_status", nullable = false, length = 40)
    @Builder.Default
    private String qualityStatus = "UNKNOWN";

    @Column(name = "summary_json", columnDefinition = "TEXT")
    private String summaryJson;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processed_by_user_id")
    private User processedByUser;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;
}
