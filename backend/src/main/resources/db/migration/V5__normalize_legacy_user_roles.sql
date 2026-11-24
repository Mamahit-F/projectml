-- ====================================================================
-- Flyway Database Migration: V5__normalize_legacy_user_roles.sql
-- Ensures all legacy user accounts (e.g., ADMIN/STAFF/VILLAGE_DEAN)
-- conform to the single-role enum value 'ROLE_USER' so login never
-- crashes with IllegalArgumentException (No enum constant Role.*).
-- ====================================================================

UPDATE users
SET role = 'ROLE_USER',
    updated_at = CURRENT_TIMESTAMP
WHERE role IS NULL OR role <> 'ROLE_USER';
