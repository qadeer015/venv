// controllers/environmentController.js
const Project = require('../models/Project');
const Environment = require('../models/Environment');
const ProjectAccess = require('../models/ProjectAccess');
const AppError = require('../utils/AppError');

const environmentController = {
    // ── POST: Add or update environment variable ────────────────────
    async upsert(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.projectId);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Check permission: owner or editor
            const isOwner = project.user_id === req.user.id;
            if (!isOwner) {
                const access = await ProjectAccess.hasAccess(project.id, req.user.id);
                if (!access || access.permission !== 'edit') {
                    throw AppError.forbidden('You do not have permission to edit environment variables');
                }
            }

            const { envKey, envValue } = req.body;

            if (!envKey || !envKey.trim()) {
                throw AppError.badRequest('Environment variable key is required');
            }

            // Validate key format (uppercase, underscore, numbers)
            if (!/^[A-Z_][A-Z0-9_]*$/.test(envKey.trim())) {
                throw AppError.badRequest('Key must be uppercase letters, numbers, and underscores only (e.g., DATABASE_URL)');
            }

            await Environment.upsert(project.id, envKey.trim(), envValue || '');

            res.redirect(`/projects/${project.id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Bulk update environment variables ─────────────────────
    async bulkUpsert(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.projectId);
            if (!project) {
                throw AppError.notFound('Project');
            }

            const isOwner = project.user_id === req.user.id;
            if (!isOwner) {
                const access = await ProjectAccess.hasAccess(project.id, req.user.id);
                if (!access || access.permission !== 'edit') {
                    throw AppError.forbidden('You do not have permission to edit environment variables');
                }
            }

            const { envVars } = req.body; // Array of { key, value }

            if (!envVars || !Array.isArray(envVars) || envVars.length === 0) {
                throw AppError.badRequest('No environment variables provided');
            }

            // Validate keys
            for (const ev of envVars) {
                if (!ev.key || !/^[A-Z_][A-Z0-9_]*$/.test(ev.key.trim())) {
                    throw AppError.badRequest(`Invalid key format: ${ev.key}`);
                }
            }

            const formatted = envVars.map(ev => ({
                key: ev.key.trim(),
                value: ev.value || ''
            }));

            await Environment.bulkUpsert(project.id, formatted);

            res.redirect(`/projects/${project.id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── DELETE: Delete environment variable ─────────────────────────
    async delete(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.projectId);
            if (!project) {
                throw AppError.notFound('Project');
            }

            const isOwner = project.user_id === req.user.id;
            if (!isOwner) {
                const access = await ProjectAccess.hasAccess(project.id, req.user.id);
                if (!access || access.permission !== 'edit') {
                    throw AppError.forbidden('You do not have permission to delete environment variables');
                }
            }

            const envVar = await Environment.findById(req.params.envId);
            if (!envVar) {
                throw AppError.notFound('Environment variable');
            }

            if (envVar.project_id !== project.id) {
                throw AppError.badRequest('Environment variable does not belong to this project');
            }

            await Environment.delete(envVar.id);

            res.redirect(`/projects/${project.id}`);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = environmentController;