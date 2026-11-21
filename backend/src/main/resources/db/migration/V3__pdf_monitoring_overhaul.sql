-- ====================================================================
-- Flyway Database Migration: V3__pdf_monitoring_overhaul.sql
-- Project: StudentInsight v2.0
-- Single-Role (ROLE_USER) PDF-Driven Student Monitoring & Dynamic ML
-- ====================================================================

-- 1. Migrate all accounts to single role ROLE_USER and ensure 'user' exists
UPDATE users SET role = 'ROLE_USER';

-- 2. Relax student columns so students can be imported directly from Village Dean PDFs
ALTER TABLE students ALTER COLUMN residence_category_id DROP NOT NULL;
ALTER TABLE students ALTER COLUMN current_address DROP NOT NULL;
ALTER TABLE students ALTER COLUMN qr_token DROP NOT NULL;

ALTER TABLE students ADD COLUMN IF NOT EXISTS first_name VARCHAR(150);
ALTER TABLE students ADD COLUMN IF NOT EXISTS last_name VARCHAR(100);
ALTER TABLE students ADD COLUMN IF NOT EXISTS latest_sabbath_points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS previous_sabbath_points INTEGER;
ALTER TABLE students ADD COLUMN IF NOT EXISTS points_delta INTEGER NOT NULL DEFAULT 0;
ALTER TABLE students ADD COLUMN IF NOT EXISTS risk_category VARCHAR(20) NOT NULL DEFAULT 'SAFE';
ALTER TABLE students ADD COLUMN IF NOT EXISTS projected_end_points DOUBLE PRECISION;

UPDATE students
SET latest_sabbath_points = COALESCE(total_violation_points, 0),
    risk_category = CASE
        WHEN COALESCE(total_violation_points, 0) = 0 THEN 'SAFE'
        WHEN COALESCE(total_violation_points, 0) >= 20 THEN 'HIGH'
        WHEN COALESCE(total_violation_points, 0) >= 10 THEN 'MEDIUM'
        ELSE 'LOW'
    END
WHERE latest_sabbath_points = 0 AND COALESCE(total_violation_points, 0) > 0;

CREATE INDEX IF NOT EXISTS idx_students_study_program ON students(study_program);
CREATE INDEX IF NOT EXISTS idx_students_risk_category ON students(risk_category);
CREATE INDEX IF NOT EXISTS idx_students_latest_points ON students(latest_sabbath_points);

-- 3. Semester settings table (dynamic cutoff & optional final limit)
CREATE TABLE IF NOT EXISTS semester_settings (
    id BIGSERIAL PRIMARY KEY,
    semester_name VARCHAR(120) NOT NULL,
    semester_start_date DATE NOT NULL,
    attendance_cutoff_date DATE NOT NULL,
    semester_end_date DATE NOT NULL,
    final_point_limit INTEGER,
    attendance_closed BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO semester_settings (semester_name, semester_start_date, attendance_cutoff_date, semester_end_date, final_point_limit, attendance_closed)
SELECT 'Semester Ganjil 2026/2027', DATE '2026-08-17', DATE '2026-11-27', DATE '2026-12-04', NULL, FALSE
WHERE NOT EXISTS (SELECT 1 FROM semester_settings);

-- 4. PDF Reports archive table
CREATE TABLE IF NOT EXISTS pdf_reports (
    id BIGSERIAL PRIMARY KEY,
    file_name VARCHAR(255) NOT NULL,
    faculty_name VARCHAR(150) NOT NULL,
    report_date DATE NOT NULL,
    period_label VARCHAR(120),
    total_students INTEGER NOT NULL DEFAULT 0,
    zero_point_students INTEGER NOT NULL DEFAULT 0,
    students_with_points INTEGER NOT NULL DEFAULT 0,
    max_points INTEGER NOT NULL DEFAULT 0,
    avg_points DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    uploaded_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pdf_reports_date ON pdf_reports(report_date);

-- 5. Historical student point records per uploaded PDF snapshot
CREATE TABLE IF NOT EXISTS student_point_records (
    id BIGSERIAL PRIMARY KEY,
    pdf_report_id BIGINT NOT NULL REFERENCES pdf_reports(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    row_number INTEGER,
    sabbath_points INTEGER NOT NULL DEFAULT 0,
    points_delta INTEGER NOT NULL DEFAULT 0,
    risk_category VARCHAR(20) NOT NULL DEFAULT 'SAFE',
    projected_end_points DOUBLE PRECISION,
    percentile_rank DOUBLE PRECISION,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_pdf_student UNIQUE (pdf_report_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_spr_report ON student_point_records(pdf_report_id);
CREATE INDEX IF NOT EXISTS idx_spr_student ON student_point_records(student_id);

-- 6. Extend ml_predictions for dynamic clustering & projection snapshots
ALTER TABLE ml_predictions ADD COLUMN IF NOT EXISTS pdf_report_id BIGINT REFERENCES pdf_reports(id) ON DELETE SET NULL;
ALTER TABLE ml_predictions ADD COLUMN IF NOT EXISTS projected_end_points DOUBLE PRECISION;
ALTER TABLE ml_predictions ADD COLUMN IF NOT EXISTS points_delta INTEGER DEFAULT 0;
ALTER TABLE ml_predictions ADD COLUMN IF NOT EXISTS current_points INTEGER DEFAULT 0;
ALTER TABLE ml_predictions ADD COLUMN IF NOT EXISTS percentile_rank DOUBLE PRECISION DEFAULT 0.0;
ALTER TABLE ml_predictions ADD COLUMN IF NOT EXISTS analysis_mode VARCHAR(50) DEFAULT 'DYNAMIC_KMEANS_CLUSTERING';
