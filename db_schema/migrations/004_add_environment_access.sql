-- ============================================================
-- Add environment-based access to project_access table
-- ============================================================

-- Add environments column to store which environments a user has access to.
-- Stored as a comma-separated list: 'development,staging,production'
ALTER TABLE project_access
    ADD COLUMN environments VARCHAR(255) NOT NULL DEFAULT 'development,staging,production' AFTER permission;

-- Backfill existing approved access records with all environments
-- so existing users retain access to all environments
UPDATE project_access
SET environments = 'development,staging,production'
WHERE status = 'approved';