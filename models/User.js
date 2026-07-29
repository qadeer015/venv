// models/User.js
const db = require('../config/db');
const bcrypt = require('bcryptjs');

const User = {
    /**
     * Create a new user
     */
    async create({ email, password, name = null, username = null, organization = null }) {
        const hashedPassword = await bcrypt.hash(password, 12);
        const [result] = await db.query(
            `INSERT INTO users (email, password, name, username, organization)
             VALUES (?, ?, ?, ?, ?)`,
            [email, hashedPassword, name, username, organization]
        );
        return result.insertId;
    },

    /**
     * Find user by ID
     */
    async findById(id) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE id = ? AND status = ?',
            [id, 'active']
        );
        return rows[0] || null;
    },

    /**
     * Find user by email
     */
    async findByEmail(email) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE email = ? AND status = ?',
            [email, 'active']
        );
        return rows[0] || null;
    },

    /**
     * Find user by username
     */
    async findByUsername(username) {
        const [rows] = await db.query(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );
        return rows[0] || null;
    },

    /**
     * Verify password
     */
    async verifyPassword(plainPassword, hashedPassword) {
        return bcrypt.compare(plainPassword, hashedPassword);
    },

    /**
     * Update user profile (onboarding)
     */
    async updateProfile(id, { name, username, organization }) {
        const [result] = await db.query(
            `UPDATE users
             SET name = COALESCE(?, name),
                 username = COALESCE(?, username),
                 organization = COALESCE(?, organization),
                 onboarded = 1
             WHERE id = ?`,
            [name, username, organization, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Update password
     */
    async updatePassword(id, newPassword) {
        const hashedPassword = await bcrypt.hash(newPassword, 12);
        const [result] = await db.query(
            'UPDATE users SET password = ? WHERE id = ?',
            [hashedPassword, id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Soft delete user
     */
    async softDelete(id) {
        const [result] = await db.query(
            'UPDATE users SET status = ? WHERE id = ?',
            ['deleted', id]
        );
        return result.affectedRows > 0;
    },

    /**
     * Search users by email (for access sharing)
     */
    async searchByEmail(email, excludeUserId) {
        const [rows] = await db.query(
            `SELECT id, email, name, username
             FROM users
             WHERE email LIKE ? AND id != ? AND status = ?
             LIMIT 10`,
            [`%${email}%`, excludeUserId, 'active']
        );
        return rows;
    }
};

module.exports = User;