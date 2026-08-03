-- ============================================================
-- Migration: Add environment and note columns to environments table
-- Run this on existing databases to add the new fields
-- ============================================================

USE venv_manager;

-- Add environment column (ENUM: development, staging, production)
-- Only add if it doesn't exist
SET @dbname = DATABASE();
SET @tablename = 'environments';
SET @columnname = 'environment';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN environment ENUM(''development'',''staging'',''production'') NOT NULL DEFAULT ''development'' AFTER env_value')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add note column (optional text)
-- Only add if it doesn't exist
SET @columnname = 'note';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND COLUMN_NAME = @columnname
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN note TEXT DEFAULT NULL AFTER environment')
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update the unique key to include environment
-- (drop old unique key on project_id + env_key, add new one with environment)
-- Only update if the old index exists
SET @indexname = 'uq_env_project_key';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
    WHERE
      TABLE_SCHEMA = @dbname
      AND TABLE_NAME = @tablename
      AND INDEX_NAME = @indexname
  ) > 0,
  'ALTER TABLE environments DROP INDEX uq_env_project_key, ADD UNIQUE KEY uq_env_project_key_env (project_id, env_key, environment)',
  'SELECT 1'
));
PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
