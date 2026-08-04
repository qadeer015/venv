// models/ProjectAccess.js
const db = require('../config/db');

const ProjectAccess = {
    /**
     * Create an access request or grant direct access
     */
    async create({ projectId, userId, permission = 'view', status = 'pending', expiresAt = null }) {
        const [result] = await db.query(
            `INSERT INTO project_access (project_id, user_id, permission, status, expires_at)
             VALUES (?, ?, ?, ?, ?)
             ON DUPLICATE KEY UPDATE 
                 permission = VALUES(permission), 
                 status = VALUES(status),
                 expires_at = VALUES(expires_at)`,
            [projectId, userId, permission, status, expiresAt]
        );
        return result.insertId;
    },

    /**
     * Find access record by ID
     */
    async findById(id) {
        const [rows] = await db.query(
            `SELECT pa.*, u.email, u.name as user_name, u.username,
                    p.name as project_name, p.user_id as owner_id
             FROM project_access pa
             JOIN users u ON u.id = pa.user_id
             JOIN projects p ON p.id = pa.project_id
             WHERE pa.id = ?`,
            [id]
        );
        return rows[0] || null;
    },

    /**
     * Check if a user has access to a project
     */
    async hasAccess(projectId, userId) {
        const [rows] = await db.query(
            `SELECT * FROM project_access
             WHERE project_id = ? AND user_id = ? AND status = ?
             LIMIT 1`,
            [projectId, userId, 'approved']
        );
        return rows[0] || null;
    },

    /**
     * Get all access records for a project (for owner)
     */
    async findByProjectId(projectId) {
        const [rows] = await db.query(
            `SELECT pa.*, u.email, u.name as user_name, u.username
             FROM project_access pa
             JOIN users u ON u.id = pa.user_id
             WHERE pa.project_id = ?
             ORDER BY pa.created_at DESC`,
            [projectId]
        );
        return rows;
    },

    /**
     * Get all access requests made by a user
     */
    async findByUserId(userId) {
        const [rows] = await db.query(
            `SELECT pa.*, p.name as project_name, p.slug as project_slug,
                    u.email as owner_email, u.name as owner_name
             FROM project_access pa
             JOIN projects p ON p.id = pa.project_id
             JOIN users u ON u.id = p.user_id
             WHERE pa.user_id = ?
             ORDER BY pa.created_at DESC`,
            [userId]
        );
        return rows;
    },

    /**
     * Get pending access requests for a user's projects
     */
    async findPendingByOwner(userId) {
        const [rows] = await db.query(
            `SELECT pa.*, u.email, u.name as user_name, u.username,
                    p.name as project_name, p.slug as project_slug,
                    owner.username as owner_username
             FROM project_access pa
             JOIN projects p ON p.id = pa.project_id
             JOIN users u ON u.id = pa.user_id
             JOIN users owner ON owner.id = p.user_id
             WHERE p.user_id = ? AND pa.status = ?
             ORDER BY pa.created_at DESC`,
            [userId, 'pending']
        );
        return rows;
    },

    /**
     * Find a pending invitation for a specific user and project.
     * Invitations expire automatically after expires_at passes.
     */
    async findPendingInvitation(projectId, userId) {
        const [rows] = await db.query(
            `SELECT pa.*, u.name as inviter_name, u.username as inviter_username,
                    p.name as project_name, p.slug as project_slug
             FROM project_access pa
             JOIN projects p ON p.id = pa.project_id
             JOIN users u ON u.id = p.user_id
             WHERE pa.project_id = ? AND pa.user_id = ?
                 AND pa.status = ?
                 AND (pa.expires_at IS NULL OR pa.expires_at > CURRENT_TIMESTAMP)
             ORDER BY pa.created_at DESC
             LIMIT 1`,
            [projectId, userId, 'invited']
        );
        return rows[0] || null;
    },

    /**
     * Find all pending (non-expired) invitations for a user.
     */
    async findPendingInvitationsForUser(userId, projectId = null) {
        let query = `SELECT pa.*, u.name as inviter_name, u.username as inviter_username,
                    p.name as project_name, p.slug as project_slug
             FROM project_access pa
             JOIN projects p ON p.id = pa.project_id
             JOIN users u ON u.id = p.user_id
             WHERE pa.user_id = ? AND pa.status = ?
                 AND (pa.expires_at IS NULL OR pa.expires_at > CURRENT_TIMESTAMP)`;

        const params = [parseInt(userId), 'invited'];

        if (projectId) {
            query += ' AND pa.project_id = ?';
            params.push(parseInt(projectId));
        }

        query += ' ORDER BY pa.created_at DESC';

        const [rows] = await db.query(query, params);
        return rows;
    },

    /**
     * Expire all invitations that are past their expiry date.
     * Returns the number of rows affected.
     */
    async expireOverdue() {
        const [result] = await db.query(
            `UPDATE project_access
             SET status = ?
             WHERE status = ? AND expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP`,
            ['expired', 'invited']
        );
        return result.affectedRows;
    },

    /**
     * Update access status (approve / reject)
     */
    async updateStatus(id, status) {
        const [result] = await db.query(
            'UPDATE project_access SET status = ? WHERE id = ?',
            [status, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Update permission level
     */
    async updatePermission(id, permission) {
        const [result] = await db.query(
            'UPDATE project_access SET permission = ? WHERE id = ?',
            [permission, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Revoke access (delete)
     */
    async delete(id) {
        const [result] = await db.query(
            'DELETE FROM project_access WHERE id = ?',
            [id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Check if access request already exists
     */
    async exists(projectId, userId) {
        const [rows] = await db.query(
            'SELECT id, status, expires_at FROM project_access WHERE project_id = ? AND user_id = ? LIMIT 1',
            [projectId, userId]
        );
        return rows[0] || null;
    }
};

module.exports = ProjectAccess;