-- ====================================================================
-- Flyway Database Migration: V8__remove_legacy_demo_users.sql
-- Project: StudentInsight
-- Remove legacy v1 demo accounts ('admin', 'staff', 'dean') seeded by V2
-- with weak hardcoded 'password123' credentials before production deploy.
-- Only the bootstrap/production account(s) managed via environment config
-- remain active.
-- ====================================================================

DELETE FROM public.users
WHERE username IN ('admin', 'staff', 'dean')
  AND email IN ('admin@unklab.ac.id', 'staff@unklab.ac.id', 'dean@unklab.ac.id');
