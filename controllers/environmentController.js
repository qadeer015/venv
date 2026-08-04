// controllers/environmentController.js
const Project = require('../models/Project');
const Environment = require('../models/Environment');
const ProjectAccess = require('../models/ProjectAccess');
const AppError = require('../utils/AppError');

const VALID_ENVIRONMENTS = ['development', 'staging', 'production'];

const environmentController = {
    // ── POST: Add or update environment variable ────────────────────
    async upsert(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            const { envKey, envValue, environment, note } = req.body;

            // Validate environment
            const env = environment || 'development';
            if (!VALID_ENVIRONMENTS.includes(env)) {
                throw AppError.badRequest('Environment must be one of: development, staging, production');
            }

            // Check permission: owner or editor with access to this environment
            const isOwner = project.user_id === req.user.id;
            if (!isOwner) {
                const access = await ProjectAccess.hasAccess(project.id, req.user.id, env);
                if (!access || access.permission !== 'edit') {
                    throw AppError.forbidden('You do not have permission to edit environment variables in this environment');
                }
            }

            if (!envKey || !envKey.trim()) {
                throw AppError.badRequest('Environment variable key is required');
            }

            // Validate key format (uppercase, underscore, numbers)
            if (!/^[A-Z_][A-Z0-9_]*$/.test(envKey.trim())) {
                throw AppError.badRequest('Key must be uppercase letters, numbers, and underscores only (e.g., DATABASE_URL)');
            }

            await Environment.upsert(project.id, envKey.trim(), envValue || '', env, note || null);

            res.redirect(`/${username}/${projectSlug}`);
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            const { envVars } = req.body; // Array of { key, value, environment, note }

            if (!envVars || !Array.isArray(envVars) || envVars.length === 0) {
                throw AppError.badRequest('No environment variables provided');
            }

            // Validate keys and environments
            for (const ev of envVars) {
                if (!ev.key || !/^[A-Z_][A-Z0-9_]*$/.test(ev.key.trim())) {
                    throw AppError.badRequest(`Invalid key format: ${ev.key}`);
                }
                const env = ev.environment || 'development';
                if (!VALID_ENVIRONMENTS.includes(env)) {
                    throw AppError.badRequest(`Invalid environment for key ${ev.key}: must be development, staging, or production`);
                }
            }

            const formatted = envVars.map(ev => ({
                key: ev.key.trim(),
                value: ev.value || '',
                environment: ev.environment || 'development',
                note: ev.note || null
            }));

            // Check permission: owner or editor with access to all target environments
            const isOwner = project.user_id === req.user.id;
            if (!isOwner) {
                const targetEnvs = [...new Set(formatted.map(ev => ev.environment))];
                for (const env of targetEnvs) {
                    const access = await ProjectAccess.hasAccess(project.id, req.user.id, env);
                    if (!access || access.permission !== 'edit') {
                        throw AppError.forbidden(`You do not have permission to edit environment variables in the ${env} environment`);
                    }
                }
            }

            await Environment.bulkUpsert(project.id, formatted);

            res.redirect(`/${username}/${projectSlug}`);
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            const envVar = await Environment.findById(req.params.envId);
            if (!envVar) {
                throw AppError.notFound('Environment variable');
            }

            if (envVar.project_id !== project.id) {
                throw AppError.badRequest('Environment variable does not belong to this project');
            }

            // Check permission: owner or editor with access to this environment
            const isOwner = project.user_id === req.user.id;
            if (!isOwner) {
                const access = await ProjectAccess.hasAccess(project.id, req.user.id, envVar.environment);
                if (!access || access.permission !== 'edit') {
                    throw AppError.forbidden(`You do not have permission to delete environment variables in the ${envVar.environment} environment`);
                }
            }

            await Environment.delete(envVar.id);

            res.redirect(`/${username}/${projectSlug}`);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = environmentController;