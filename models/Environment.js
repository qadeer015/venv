// models/Environment.js
const db = require('../config/db');

const Environment = {
    /**
     * Create or update an environment variable (upsert)
     */
    async upsert(projectId, envKey, envValue, environment = 'development', note = null) {
        const [result] = await db.query(
            `INSERT INTO environments (project_id, env_key, env_value, environment, note)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE env_value = VALUES(env_value), note = VALUES(note)`,
            [projectId, envKey, envValue, environment, note]
        );
        return result.affectedRows > 0;
    },

    /**
     * Get all environment variables for a project
     */
    async findByProjectId(projectId) {
        const [rows] = await db.query(
            'SELECT id, env_key, env_value, environment, note, created_at, updated_at FROM environments WHERE project_id = ? ORDER BY environment ASC, env_key ASC',
            [projectId]
        );
        return rows;
    },

    /**
     * Get a single environment variable by ID
     */
    async findById(id) {
        const [rows] = await db.query(
            'SELECT * FROM environments WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Get a single environment variable by key and environment
     */
    async findByKey(projectId, envKey, environment = 'development') {
        const [rows] = await db.query(
            'SELECT * FROM environments WHERE project_id = ? AND env_key = ? AND environment = ?',
            [projectId, envKey, environment]
        );
        return rows[0] || null;
    },

    /**
     * Update an environment variable
     */
    async update(id, envValue, environment, note) {
        const [result] = await db.query(
            'UPDATE environments SET env_value = ?, environment = ?, note = ? WHERE id = ?',
            [envValue, environment, note, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Delete an environment variable
     */
    async delete(id) {
        const [result] = await db.query(
            'DELETE FROM environments WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Delete all environment variables for a project
     */
    async deleteByProjectId(projectId) {
        const [result] = await db.query(
            'DELETE FROM environments WHERE project_id = ?',
            [projectId]
        );
        return result.affectedRows > 0;
    },

    /**
     * Count environment variables for a project
     */
    async countByProjectId(projectId) {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM environments WHERE project_id = ?',
            [projectId]
        );
        return rows[0].count;
    },

    /**
     * Bulk upsert environment variables
     */
    async bulkUpsert(projectId, envVars) {
        if (!envVars || envVars.length === 0) return true;

        // Build a single multi-value INSERT ... ON DUPLICATE KEY UPDATE
        const placeholders = envVars.map(() => '(?, ?, ?, ?, ?)').join(', ');
        const values = [];
        for (const { key, value, environment, note } of envVars) {
            values.push(projectId, key, value, environment || 'development', note || null);
        }

        const [result] = await db.query(
            `INSERT INTO environments (project_id, env_key, env_value, environment, note)
             VALUES ${placeholders}
             ON DUPLICATE KEY UPDATE env_value = VALUES(env_value), note = VALUES(note)`,
            values
        );
        return result.affectedRows > 0;
    }
};

module.exports = Environment;