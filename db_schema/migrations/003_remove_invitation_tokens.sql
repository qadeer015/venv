-- ============================================================
-- Remove token/session-based invitation logic, add expiry
-- ============================================================

-- Remove invitation token and response tracking columns,
-- add expires_at for the 7-day invitation window
ALTER TABLE project_access
    DROP COLUMN invitation_token,
    DROP COLUMN invited_at,
    DROP COLUMN responded_at,
    ADD COLUMN expires_at TIMESTAMP NULL DEFAULT NULL AFTER status;

-- Extend status ENUM with 'expired' (reserved for cleanup) while
-- keeping 'invited' as the pending-invitation state
ALTER TABLE project_access
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'invited', 'accepted', 'declined', 'expired') NOT NULL DEFAULT 'pending';

-- Backfill a 1-week expiry window for invitations that were
-- created before this migration so they also auto-expire.
UPDATE project_access
SET expires_at = DATE_ADD(created_at, INTERVAL 7 DAY)
WHERE status = 'invited' AND expires_at IS NULL;
