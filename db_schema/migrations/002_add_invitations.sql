-- ============================================================
-- Add invitation support to project_access table
-- ============================================================

-- Modify project_access table to add invitation fields
ALTER TABLE project_access
    ADD COLUMN invitation_token VARCHAR(64) DEFAULT NULL UNIQUE AFTER status,
    ADD COLUMN invited_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ADD COLUMN responded_at TIMESTAMP NULL DEFAULT NULL,
    ADD INDEX idx_invitation_token (invitation_token);

-- Update status ENUM to include invitation states
ALTER TABLE project_access
    MODIFY COLUMN status ENUM('pending', 'approved', 'rejected', 'invited', 'accepted', 'declined') NOT NULL DEFAULT 'pending';