-- ====================================================================
-- Flyway Database Migration: V7__remove_legacy_demo_students.sql
-- Project: StudentInsight
-- Align database with strictly PDF-driven student monitoring flow:
-- Removes legacy v1 demo seed students (inserted by V2) and any orphan
-- student rows that are not backed by an uploaded PDF report.
-- Related emergency_contacts, attendances, violation_points,
-- welfare_reports, follow_up_records, and ml_predictions cascade cleanly.
-- ====================================================================

DELETE FROM public.students s
WHERE NOT EXISTS (
    SELECT 1
    FROM public.student_point_records spr
    WHERE spr.student_id = s.id
);

DELETE FROM public.ml_predictions
WHERE pdf_report_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM public.pdf_reports);
