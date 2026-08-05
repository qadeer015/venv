-- ============================================================
-- Add avatar column to users table
-- ============================================================

-- Store the avatar image path/filename for each user.
-- Defaults to null (no avatar chosen yet).
ALTER TABLE users
    ADD COLUMN avatar VARCHAR(255) DEFAULT NULL AFTER organization;