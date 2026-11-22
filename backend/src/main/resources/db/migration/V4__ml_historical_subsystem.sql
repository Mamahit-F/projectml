-- ====================================================================
-- Flyway Database Migration: V4__ml_historical_subsystem.sql
-- Project: StudentInsight v3.0
-- Historical ML Subsystem: Dataset Versioning, Student Continuity,
-- Training Runs, Model Registry, Cluster Assignments & Prediction Logs
-- ====================================================================

-- 1. Historical Dataset Processing & Version History
CREATE TABLE IF NOT EXISTS ml_dataset_versions (
    id BIGSERIAL PRIMARY KEY,
    version_code VARCHAR(80) NOT NULL UNIQUE,
    dataset_fingerprint VARCHAR(64) NOT NULL,
    source_directory TEXT NOT NULL,
    folders_scanned INTEGER NOT NULL DEFAULT 0,
    files_total INTEGER NOT NULL DEFAULT 0,
    files_succeeded INTEGER NOT NULL DEFAULT 0,
    files_failed INTEGER NOT NULL DEFAULT 0,
    total_records INTEGER NOT NULL DEFAULT 0,
    unique_students INTEGER NOT NULL DEFAULT 0,
    verified_students INTEGER NOT NULL DEFAULT 0,
    uncertain_identities INTEGER NOT NULL DEFAULT 0,
    quality_status VARCHAR(40) NOT NULL DEFAULT 'UNKNOWN',
    summary_json TEXT,
    processed_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ml_dataset_versions_created ON ml_dataset_versions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_dataset_versions_fingerprint ON ml_dataset_versions(dataset_fingerprint);

-- 2. Historical Reporting Periods per Dataset Version
CREATE TABLE IF NOT EXISTS ml_reporting_periods (
    id BIGSERIAL PRIMARY KEY,
    dataset_version_id BIGINT NOT NULL REFERENCES ml_dataset_versions(id) ON DELETE CASCADE,
    period_index INTEGER NOT NULL,
    folder_name VARCHAR(60) NOT NULL,
    reporting_date DATE NOT NULL,
    academic_semester VARCHAR(40) NOT NULL,
    period_label VARCHAR(120) NOT NULL,
    files_count INTEGER NOT NULL DEFAULT 0,
    records_count INTEGER NOT NULL DEFAULT 0,
    mean_points DOUBLE PRECISION,
    median_points DOUBLE PRECISION,
    max_points INTEGER,
    zero_point_pct DOUBLE PRECISION,
    CONSTRAINT uq_ml_period_version_date UNIQUE (dataset_version_id, reporting_date)
);

CREATE INDEX IF NOT EXISTS idx_ml_reporting_periods_ds ON ml_reporting_periods(dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_ml_reporting_periods_date ON ml_reporting_periods(reporting_date);

-- 3. Student Continuity & Eligibility Tracking (links to existing students table when matched by NIM)
CREATE TABLE IF NOT EXISTS ml_student_continuity (
    id BIGSERIAL PRIMARY KEY,
    dataset_version_id BIGINT NOT NULL REFERENCES ml_dataset_versions(id) ON DELETE CASCADE,
    internal_student_id VARCHAR(40) NOT NULL,
    student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    nim VARCHAR(30),
    continuity_status VARCHAR(50) NOT NULL,
    total_observed_periods INTEGER NOT NULL DEFAULT 0,
    missing_periods_count INTEGER NOT NULL DEFAULT 0,
    max_consecutive_periods INTEGER NOT NULL DEFAULT 0,
    disappearance_events INTEGER NOT NULL DEFAULT 0,
    return_events INTEGER NOT NULL DEFAULT 0,
    presence_pattern VARCHAR(32),
    first_observed_date DATE,
    last_observed_date DATE,
    clustering_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    prediction_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    future_inference_eligible BOOLEAN NOT NULL DEFAULT FALSE,
    exclusion_reason TEXT,
    observed_avg_points DOUBLE PRECISION,
    latest_observed_points INTEGER,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ml_cont_ds_internal UNIQUE (dataset_version_id, internal_student_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_cont_ds ON ml_student_continuity(dataset_version_id);
CREATE INDEX IF NOT EXISTS idx_ml_cont_student ON ml_student_continuity(student_id);
CREATE INDEX IF NOT EXISTS idx_ml_cont_nim ON ml_student_continuity(nim);
CREATE INDEX IF NOT EXISTS idx_ml_cont_status ON ml_student_continuity(continuity_status);

-- 4. ML Training Runs History
CREATE TABLE IF NOT EXISTS ml_training_runs (
    id BIGSERIAL PRIMARY KEY,
    run_code VARCHAR(80) NOT NULL UNIQUE,
    dataset_version_code VARCHAR(80),
    task_type VARCHAR(40) NOT NULL, -- CLUSTERING, SUPERVISED_BOTH, SUPERVISED_REGRESSION, SUPERVISED_CLASSIFICATION
    status VARCHAR(30) NOT NULL, -- COMPLETED, FAILED
    parameters_json TEXT,
    metrics_summary_json TEXT,
    error_message TEXT,
    triggered_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ml_runs_started ON ml_training_runs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_ml_runs_task ON ml_training_runs(task_type);

-- 5. Versioned ML Models Metadata & Active Model Selection
CREATE TABLE IF NOT EXISTS ml_models (
    id BIGSERIAL PRIMARY KEY,
    model_id VARCHAR(120) NOT NULL UNIQUE,
    run_code VARCHAR(80),
    dataset_version_code VARCHAR(80),
    model_name VARCHAR(120) NOT NULL,
    model_type VARCHAR(30) NOT NULL, -- CLUSTERING, REGRESSION, CLASSIFICATION
    algorithm VARCHAR(80) NOT NULL,
    version VARCHAR(30) NOT NULL,
    artifact_path TEXT,
    target_definition TEXT,
    features_json TEXT,
    parameters_json TEXT,
    evaluation_metrics_json TEXT,
    adequate BOOLEAN NOT NULL DEFAULT TRUE,
    status VARCHAR(30) NOT NULL DEFAULT 'CANDIDATE', -- CANDIDATE, ACTIVE, ARCHIVED, NEEDS_REVIEW
    is_selected BOOLEAN NOT NULL DEFAULT FALSE,
    selection_reason TEXT,
    selection_notes TEXT,
    trained_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    selected_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_ml_models_type_selected ON ml_models(model_type, is_selected);
CREATE INDEX IF NOT EXISTS idx_ml_models_trained_at ON ml_models(trained_at DESC);

-- 6. Unsupervised Cluster Assignments per Student
CREATE TABLE IF NOT EXISTS ml_cluster_assignments (
    id BIGSERIAL PRIMARY KEY,
    model_id VARCHAR(120) NOT NULL REFERENCES ml_models(model_id) ON DELETE CASCADE,
    internal_student_id VARCHAR(40) NOT NULL,
    student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    nim VARCHAR(30),
    cluster_id INTEGER NOT NULL,
    cluster_label VARCHAR(160) NOT NULL,
    pca_x DOUBLE PRECISION,
    pca_y DOUBLE PRECISION,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_ml_cluster_model_stu UNIQUE (model_id, internal_student_id)
);

CREATE INDEX IF NOT EXISTS idx_ml_cluster_model ON ml_cluster_assignments(model_id);
CREATE INDEX IF NOT EXISTS idx_ml_cluster_student ON ml_cluster_assignments(student_id);

-- 7. Supervised Future Prediction Audit Log
CREATE TABLE IF NOT EXISTS ml_prediction_logs (
    id BIGSERIAL PRIMARY KEY,
    dataset_version_code VARCHAR(80),
    regression_model_id VARCHAR(120),
    classification_model_id VARCHAR(120),
    internal_student_id VARCHAR(40) NOT NULL,
    student_id BIGINT REFERENCES students(id) ON DELETE SET NULL,
    nim VARCHAR(30),
    predicted_next_points DOUBLE PRECISION,
    predicted_category VARCHAR(30),
    confidence DOUBLE PRECISION,
    probabilities_json TEXT,
    features_used_json TEXT,
    requested_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ml_pred_logs_student ON ml_prediction_logs(student_id);
CREATE INDEX IF NOT EXISTS idx_ml_pred_logs_nim ON ml_prediction_logs(nim);
CREATE INDEX IF NOT EXISTS idx_ml_pred_logs_predicted_at ON ml_prediction_logs(predicted_at DESC);
