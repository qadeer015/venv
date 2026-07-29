// controllers/accessController.js
const User = require('../models/User');
const Project = require('../models/Project');
const ProjectAccess = require('../models/ProjectAccess');
const AppError = require('../utils/AppError');

const accessController = {
    // ── POST: Request access to a project ───────────────────────────
    async requestAccess(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.projectId);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Cannot request access to own project
            if (project.user_id === req.user.id) {
                throw AppError.badRequest('You are the owner of this project');
            }

            // Check if access already exists
            const existing = await ProjectAccess.exists(project.id, req.user.id);
            if (existing) {
                if (existing.status === 'pending') {
                    throw AppError.badRequest('Access request already pending');
                }
                if (existing.status === 'approved') {
                    throw AppError.badRequest('You already have access to this project');
                }
                // If rejected, allow re-request
            }

            await ProjectAccess.create({
                projectId: project.id,
                userId: req.user.id,
                permission: 'view',
                status: 'pending'
            });

            res.redirect(`/projects/${project.id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Grant direct access (owner action) ────────────────────
    async grantAccess(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.projectId);
            if (!project) {
                throw AppError.notFound('Project');
            }

            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can grant access');
            }

            const { email, permission } = req.body;

            if (!email || !email.trim()) {
                throw AppError.badRequest('User email is required');
            }

            const targetUser = await User.findByEmail(email.trim());
            if (!targetUser) {
                throw AppError.notFound('User', 'No user found with this email');
            }

            if (targetUser.id === req.user.id) {
                throw AppError.badRequest('You cannot grant access to yourself');
            }

            await ProjectAccess.create({
                projectId: project.id,
                userId: targetUser.id,
                permission: permission || 'view',
                status: 'approved'
            });

            res.redirect(`/projects/${project.id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Approve access request ────────────────────────────────
    async approveAccess(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const access = await ProjectAccess.findById(req.params.accessId);
            if (!access) {
                throw AppError.notFound('Access request');
            }

            // Only project owner can approve
            if (access.owner_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can approve access requests');
            }

            await ProjectAccess.updateStatus(access.id, 'approved');

            res.redirect(`/projects/${access.project_id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Reject access request ─────────────────────────────────
    async rejectAccess(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const access = await ProjectAccess.findById(req.params.accessId);
            if (!access) {
                throw AppError.notFound('Access request');
            }

            if (access.owner_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can reject access requests');
            }

            await ProjectAccess.updateStatus(access.id, 'rejected');

            res.redirect(`/projects/${access.project_id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── DELETE: Revoke access ───────────────────────────────────────
    async revokeAccess(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const access = await ProjectAccess.findById(req.params.accessId);
            if (!access) {
                throw AppError.notFound('Access record');
            }

            // Only project owner can revoke
            if (access.owner_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can revoke access');
            }

            await ProjectAccess.delete(access.id);

            res.redirect(`/projects/${access.project_id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Search users by email (for granting access) ────────────
    async searchUsers(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { email } = req.query;
            if (!email || email.length < 2) {
                return res.json([]);
            }

            const users = await User.searchByEmail(email, req.user.id);
            res.json(users);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = accessController;