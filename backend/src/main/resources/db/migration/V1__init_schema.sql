-- ====================================================================
-- Flyway Database Migration: V1__init_schema.sql
-- Project: StudentInsight
-- System: Smart Student Monitoring & Prediction System
-- ====================================================================

-- 1. USERS TABLE
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(30) NOT NULL, -- ROLE_ADMIN, ROLE_STAFF, ROLE_VILLAGE_DEAN
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- 2. RESIDENCE CATEGORIES TABLE
CREATE TABLE residence_categories (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE, -- OUTSIDER_DEKAT, OUTSIDER_JAUH
    name VARCHAR(100) NOT NULL,
    max_distance_meters INTEGER,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_residence_code ON residence_categories(code);

-- 3. STUDENTS TABLE
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    nim VARCHAR(20) NOT NULL UNIQUE,
    full_name VARCHAR(150) NOT NULL,
    study_program VARCHAR(100) NOT NULL,
    faculty VARCHAR(100) NOT NULL,
    phone_number VARCHAR(25),
    residence_category_id BIGINT NOT NULL REFERENCES residence_categories(id) ON DELETE RESTRICT,
    current_address TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, INACTIVE, PROBATION, GRADUATED
    qr_token VARCHAR(64) NOT NULL UNIQUE,
    total_violation_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_students_nim ON students(nim);
CREATE INDEX idx_students_qr_token ON students(qr_token);
CREATE INDEX idx_students_residence ON students(residence_category_id);
CREATE INDEX idx_students_status ON students(status);

-- 4. WORSHIP EVENTS TABLE
CREATE TABLE worship_events (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    event_type VARCHAR(50) NOT NULL, -- FRIDAY_VESPER, SABBATH_MORNING, SABBATH_AFTERNOON, WOP_MORNING, WOP_EVENING, WOP_CULMINATION
    event_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    location VARCHAR(150) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, ONGOING, COMPLETED, CANCELLED
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_worship_events_date ON worship_events(event_date);
CREATE INDEX idx_worship_events_type ON worship_events(event_type);
CREATE INDEX idx_worship_events_status ON worship_events(status);

-- 5. ATTENDANCE RULES TABLE
CREATE TABLE attendance_rules (
    id BIGSERIAL PRIMARY KEY,
    residence_category_id BIGINT NOT NULL REFERENCES residence_categories(id) ON DELETE RESTRICT,
    event_type VARCHAR(50) NOT NULL,
    is_mandatory BOOLEAN NOT NULL DEFAULT TRUE,
    point_penalty_weight INTEGER NOT NULL DEFAULT 5,
    notes VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_residence_event_rule UNIQUE (residence_category_id, event_type)
);

CREATE INDEX idx_attendance_rules_category ON attendance_rules(residence_category_id);

-- 6. ATTENDANCES TABLE
CREATE TABLE attendances (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    worship_event_id BIGINT NOT NULL REFERENCES worship_events(id) ON DELETE CASCADE,
    status VARCHAR(30) NOT NULL, -- PRESENT, ABSENT, EXCUSED, SICK, PENDING_VERIFICATION
    recorded_method VARCHAR(20) NOT NULL DEFAULT 'MANUAL_INPUT', -- QR_SCAN, MANUAL_INPUT
    check_in_time TIMESTAMP WITH TIME ZONE,
    verified_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_student_worship_attendance UNIQUE (student_id, worship_event_id)
);

CREATE INDEX idx_attendances_student ON attendances(student_id);
CREATE INDEX idx_attendances_event ON attendances(worship_event_id);
CREATE INDEX idx_attendances_status ON attendances(status);

-- 7. VIOLATION POINT RULES TABLE
CREATE TABLE violation_point_rules (
    id BIGSERIAL PRIMARY KEY,
    violation_type VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255) NOT NULL,
    default_points INTEGER NOT NULL DEFAULT 5,
    is_system_demo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 8. VIOLATION POINTS TABLE
CREATE TABLE violation_points (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    worship_event_id BIGINT REFERENCES worship_events(id) ON DELETE SET NULL,
    attendance_id BIGINT REFERENCES attendances(id) ON DELETE SET NULL,
    points INTEGER NOT NULL,
    reason VARCHAR(255) NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, RESOLVED, CANCELLED
    adjusted_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    adjustment_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_violation_points_student ON violation_points(student_id);
CREATE INDEX idx_violation_points_status ON violation_points(status);

-- 9. EMERGENCY CONTACTS TABLE
CREATE TABLE emergency_contacts (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    contact_name VARCHAR(150) NOT NULL,
    relationship VARCHAR(50) NOT NULL,
    phone_number VARCHAR(25) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_emergency_contacts_student ON emergency_contacts(student_id);

-- 10. WELFARE REPORTS TABLE
CREATE TABLE welfare_reports (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    report_type VARCHAR(50) NOT NULL, -- HOUSING, SECURITY, FINANCIAL, HEALTH, GENERAL_AID
    priority VARCHAR(20) NOT NULL DEFAULT 'MEDIUM', -- LOW, MEDIUM, HIGH, URGENT
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, IN_REVIEW, RESOLVED, CLOSED
    description TEXT NOT NULL,
    reported_by_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_welfare_reports_student ON welfare_reports(student_id);
CREATE INDEX idx_welfare_reports_status ON welfare_reports(status);
CREATE INDEX idx_welfare_reports_priority ON welfare_reports(priority);

-- 11. FOLLOW UP RECORDS TABLE
CREATE TABLE follow_up_records (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    conducted_by_user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    counseling_date DATE NOT NULL,
    topics_discussed TEXT NOT NULL,
    action_plan TEXT NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'SCHEDULED', -- SCHEDULED, COMPLETED, FOLLOW_UP_NEEDED
    evaluation_result TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_follow_up_student ON follow_up_records(student_id);
CREATE INDEX idx_follow_up_user ON follow_up_records(conducted_by_user_id);

-- 12. ML PREDICTIONS TABLE
CREATE TABLE ml_predictions (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    risk_category VARCHAR(20) NOT NULL, -- LOW, MEDIUM, HIGH
    prob_low DOUBLE PRECISION NOT NULL,
    prob_medium DOUBLE PRECISION NOT NULL,
    prob_high DOUBLE PRECISION NOT NULL,
    model_name VARCHAR(50) NOT NULL,
    model_version VARCHAR(30) NOT NULL,
    features_snapshot TEXT NOT NULL, -- JSON formatted features string
    predicted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ml_predictions_student ON ml_predictions(student_id);
CREATE INDEX idx_ml_predictions_risk ON ml_predictions(risk_category);

-- 13. AUDIT LOGS TABLE
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(50) NOT NULL,
    entity_name VARCHAR(50) NOT NULL,
    entity_id BIGINT,
    old_values TEXT,
    new_values TEXT,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_name, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);
