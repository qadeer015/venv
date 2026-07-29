// models/Environment.js
const db = require('../config/db');

const Environment = {
    /**
     * Create or update an environment variable (upsert)
     */
    async upsert(projectId, envKey, envValue) {
        const [result] = await db.query(
            `INSERT INTO environments (project_id, env_key, env_value)
             VALUES (?, ?, ?)
             ON DUPLICATE KEY UPDATE env_value = VALUES(env_value)`,
            [projectId, envKey, envValue]
        );
        return result.affectedRows > 0;
    },

    /**
     * Get all environment variables for a project
     */
    async findByProjectId(projectId) {
        const [rows] = await db.query(
            'SELECT id, env_key, env_value, created_at, updated_at FROM environments WHERE project_id = ? ORDER BY env_key ASC',
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
     * Get a single environment variable by key
     */
    async findByKey(projectId, envKey) {
        const [rows] = await db.query(
            'SELECT * FROM environments WHERE project_id = ? AND env_key = ?',
            [projectId, envKey]
        );
        return rows[0] || null;
    },

    /**
     * Update an environment variable
     */
    async update(id, envValue) {
        const [result] = await db.query(
            'UPDATE environments SET env_value = ? WHERE id = ?',
            [envValue, id]
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
        const placeholders = envVars.map(() => '(?, ?, ?)').join(', ');
        const values = [];
        for (const { key, value } of envVars) {
            values.push(projectId, key, value);
        }

        const [result] = await db.query(
            `INSERT INTO environments (project_id, env_key, env_value)
             VALUES ${placeholders}
             ON DUPLICATE KEY UPDATE env_value = VALUES(env_value)`,
            values
        );
        return result.affectedRows > 0;
    }
};

module.exports = Environment;