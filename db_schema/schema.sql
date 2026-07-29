-- ============================================================
-- .env Credentials Manager - Database Schema
-- Compatible with MySQL 8+ and TiDB Cloud
-- ============================================================

CREATE DATABASE IF NOT EXISTS venv_manager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE venv_manager;

-- -----------------------------------------------------------
-- 1. Users
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email         VARCHAR(255)    NOT NULL UNIQUE,
    password      VARCHAR(255)    NOT NULL,
    name          VARCHAR(255)    DEFAULT NULL,
    username      VARCHAR(100)    DEFAULT NULL UNIQUE,
    organization  VARCHAR(255)    DEFAULT NULL,
    role          ENUM('user','admin') NOT NULL DEFAULT 'user',
    status        ENUM('active','deleted') NOT NULL DEFAULT 'active',
    onboarded     TINYINT(1)      NOT NULL DEFAULT 0,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_users_email (email),
    INDEX idx_users_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 2. Projects
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT UNSIGNED NOT NULL,
    name          VARCHAR(255)    NOT NULL,
    slug          VARCHAR(255)    NOT NULL,
    github_url    VARCHAR(500)    DEFAULT NULL,
    domain        VARCHAR(500)    DEFAULT NULL,
    description   TEXT            DEFAULT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_projects_user (user_id),
    UNIQUE KEY uq_projects_user_slug (user_id, slug),

    CONSTRAINT fk_projects_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 3. Environment Variables (key-value pairs per project)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS environments (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id    BIGINT UNSIGNED NOT NULL,
    env_key       VARCHAR(255)    NOT NULL,
    env_value     TEXT            NOT NULL,
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    INDEX idx_env_project (project_id),
    UNIQUE KEY uq_env_project_key (project_id, env_key),

    CONSTRAINT fk_env_project
        FOREIGN KEY (project_id) REFERENCES projects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -----------------------------------------------------------
-- 4. Project Access (shared access for other users)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS project_access (
    id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    project_id    BIGINT UNSIGNED NOT NULL,
    user_id       BIGINT UNSIGNED NOT NULL,
    permission    ENUM('view','edit') NOT NULL DEFAULT 'view',
    status        ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
    created_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE KEY uq_access_project_user (project_id, user_id),

    CONSTRAINT fk_access_project
        FOREIGN KEY (project_id) REFERENCES projects(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE,

    CONSTRAINT fk_access_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;