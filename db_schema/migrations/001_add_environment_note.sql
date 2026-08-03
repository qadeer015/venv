-- ============================================================
-- Migration: Add environment and note columns to environments table
-- Run this on existing databases to add the new fields
-- ============================================================

USE venv_manager;

-- Add environment column (ENUM: development, staging, production)
ALTER TABLE environments
    ADD COLUMN environment ENUM('development','staging','production') NOT NULL DEFAULT 'development'
    AFTER env_value;

-- Add note column (optional text)
ALTER TABLE environments
    ADD COLUMN note TEXT DEFAULT NULL
    AFTER environment;

-- Update the unique key to include environment
-- (drop old unique key on project_id + env_key, add new one with environment)
ALTER TABLE environments
    DROP INDEX uq_env_project_key,
    ADD UNIQUE KEY uq_env_project_key_env (project_id, env_key, environment);