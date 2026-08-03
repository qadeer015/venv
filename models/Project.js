// models/Project.js
const db = require('../config/db');
const slugify = require('slugify');

const Project = {
    /**
     * Create a new project
     */
    async create({ userId, name, githubUrl = null, domain = null, description = null }) {
        const slug = slugify(name, { lower: true, strict: true });
        const [result] = await db.query(
            `INSERT INTO projects (user_id, name, slug, github_url, domain, description)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [userId, name, slug, githubUrl, domain, description]
        );
        return result.insertId;
    },

    /**
     * Find project by ID (only if user owns it or has access)
     */
    async findById(id) {
        const [rows] = await db.query(
            'SELECT * FROM projects WHERE id = ?',
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Find project by slug for a specific user
     */
    async findBySlug(userId, slug) {
        const [rows] = await db.query(
            'SELECT * FROM projects WHERE user_id = ? AND slug = ?',
            [userId, slug]
        );
        return rows[0] || null;
    },

    /**
     * Find project by username and project slug
     */
    async findByUsernameAndSlug(username, projectSlug) {
        const [rows] = await db.query(
            `SELECT p.* FROM projects p
             JOIN users u ON u.id = p.user_id
             WHERE u.username = ? AND p.slug = ?`,
            [username, projectSlug]
        );
        return rows[0] || null;
    },

    /**
     * Get all projects for a user (owned)
     */
    async findByUserId(userId) {
        const [rows] = await db.query(
            'SELECT * FROM projects WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );
        return rows;
    },

    /**
     * Get all projects a user has access to (shared with them)
     */
    async findSharedWithUser(userId) {
        const [rows] = await db.query(
            `SELECT p.*, pa.permission, pa.status, u.email as owner_email, u.name as owner_name, u.username as owner_username
             FROM projects p
             JOIN project_access pa ON pa.project_id = p.id
             JOIN users u ON u.id = p.user_id
             WHERE pa.user_id = ? AND pa.status = ?
             ORDER BY pa.created_at DESC`,
            [userId, 'approved']
        );
        return rows;
    },

    /**
     * Update project
     */
    async update(id, { name, githubUrl, domain, description }) {
        const updates = [];
        const values = [];

        if (name !== undefined) {
            const slug = slugify(name, { lower: true, strict: true });
            updates.push('name = ?, slug = ?');
            values.push(name, slug);
        }
        if (githubUrl !== undefined) {
            updates.push('github_url = ?');
            values.push(githubUrl);
        }
        if (domain !== undefined) {
            updates.push('domain = ?');
            values.push(domain);
        }
        if (description !== undefined) {
            updates.push('description = ?');
            values.push(description);
        }

        if (updates.length === 0) return false;

        values.push(id);
        const [result] = await db.query(
            `UPDATE projects SET ${updates.join(', ')} WHERE id = ?`,
            values
        );
        return result.affectedRows > 0;
    },

    /**
     * Delete project
     */
    async delete(id) {
        const [result] = await db.query(
            'DELETE FROM projects WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Count projects for a user
     */
    async countByUserId(userId) {
        const [rows] = await db.query(
            'SELECT COUNT(*) as count FROM projects WHERE user_id = ?',
            [userId]
        );
        return rows[0].count;
    }
};

module.exports = Project;