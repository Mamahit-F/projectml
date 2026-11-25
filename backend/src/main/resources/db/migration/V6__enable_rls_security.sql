-- ====================================================================
-- Flyway Database Migration: V6__enable_rls_security.sql
-- Project: StudentInsight
-- Defense-in-depth Row Level Security (RLS) for Supabase & PostgreSQL
--
-- StudentInsight accesses PostgreSQL exclusively through the Spring Boot
-- backend (connecting as the database owner / postgres role with JWT auth).
-- Enabling RLS on all tables in `public` without public policies ensures
-- Supabase's exposed Data (REST) API (`anon` / `authenticated` roles)
-- cannot read or mutate sensitive student data directly.
-- ====================================================================

DO $$
DECLARE
    tbl TEXT;
    has_anon BOOLEAN;
    has_authenticated BOOLEAN;
    app_tables TEXT[] := ARRAY[
        'users',
        'residence_categories',
        'students',
        'worship_events',
        'attendance_rules',
        'attendances',
        'violation_point_rules',
        'violation_points',
        'emergency_contacts',
        'welfare_reports',
        'follow_up_records',
        'ml_predictions',
        'audit_logs',
        'semester_settings',
        'pdf_reports',
        'student_point_records',
        'ml_dataset_versions',
        'ml_reporting_periods',
        'ml_student_continuity',
        'ml_training_runs',
        'ml_models',
        'ml_cluster_assignments',
        'ml_prediction_logs'
    ];
BEGIN
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') INTO has_anon;
    SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') INTO has_authenticated;

    FOREACH tbl IN ARRAY app_tables LOOP
        IF EXISTS (
            SELECT 1
            FROM information_schema.tables
            WHERE table_schema = 'public' AND table_name = tbl
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl);
            IF has_anon THEN
                EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl);
            END IF;
            IF has_authenticated THEN
                EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', tbl);
            END IF;
        END IF;
    END LOOP;

    -- On Supabase, explicitly revoke sequence privileges from anon & authenticated roles
    IF has_anon THEN
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    END IF;

    IF has_authenticated THEN
        REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    END IF;
END $$;
