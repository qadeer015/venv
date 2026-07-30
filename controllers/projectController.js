// controllers/projectController.js
const Project = require('../models/Project');
const Environment = require('../models/Environment');
const ProjectAccess = require('../models/ProjectAccess');
const AppError = require('../utils/AppError');

const projectController = {
    // ── GET: Dashboard - List all projects ──────────────────────────
    async dashboard(req, res, next) {
        try {
            if (!req.user) return res.redirect('/auth/login');

            const [ownedProjects, sharedProjects, pendingRequests] = await Promise.all([
                Project.findByUserId(req.user.id),
                Project.findSharedWithUser(req.user.id),
                ProjectAccess.findPendingByOwner(req.user.id)
            ]);

            res.render('dashboard/index', {
                title: 'Dashboard',
                ownedProjects,
                sharedProjects,
                pendingRequests
            });
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Show create project form ───────────────────────────────
    showCreate(req, res) {
        if (!req.user) return res.redirect('/auth/login');
        res.render('projects/create', {
            title: 'Create Project'
        });
    },

    // ── POST: Create project ────────────────────────────────────────
    async create(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { name, githubUrl, domain, description, dbSchema, envFile } = req.body;

            if (!name || !name.trim()) {
                throw AppError.badRequest('Project name is required');
            }

            const projectId = await Project.create({
                userId: req.user.id,
                name: name.trim(),
                githubUrl: githubUrl || null,
                domain: domain || null,
                description: description || null
            });

            // Store database schema as a special environment variable
            if (dbSchema && dbSchema.trim()) {
                await Environment.upsert(projectId, 'DB_SCHEMA', dbSchema.trim());
            }

            // Parse and store .env file content as individual environment variables
            if (envFile && envFile.trim()) {
                const envVars = [];
                const lines = envFile.split('\n');
                for (const line of lines) {
                    const trimmed = line.trim();
                    // Skip empty lines and comments
                    if (!trimmed || trimmed.startsWith('#')) continue;
                    const eqIndex = trimmed.indexOf('=');
                    if (eqIndex > 0) {
                        const key = trimmed.substring(0, eqIndex).trim();
                        const value = trimmed.substring(eqIndex + 1).trim();
                        if (key) {
                            envVars.push({ key, value });
                        }
                    }
                }
                if (envVars.length > 0) {
                    await Environment.bulkUpsert(projectId, envVars);
                }
            }

            res.redirect(`/projects/${projectId}`);
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Show project (with env vars) ───────────────────────────
    async show(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.id);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Check if user is owner or has approved access
            const isOwner = project.user_id === req.user.id;
            let access = null;
            if (!isOwner) {
                access = await ProjectAccess.hasAccess(project.id, req.user.id);
                if (!access) {
                    throw AppError.forbidden('You do not have access to this project');
                }
            }

            const envVars = await Environment.findByProjectId(project.id);
            const accessList = isOwner ? await ProjectAccess.findByProjectId(project.id) : [];

            res.render('projects/show', {
                title: project.name,
                project,
                envVars,
                accessList,
                isOwner,
                userAccess: access
            });
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Show edit project form ─────────────────────────────────
    async showEdit(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.id);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Only owner can edit
            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can edit');
            }

            // Fetch existing env vars for pre-filling the form
            const envVars = await Environment.findByProjectId(project.id);
            const dbSchema = envVars.find(e => e.env_key === 'DB_SCHEMA');
            const regularEnvVars = envVars.filter(e => e.env_key !== 'DB_SCHEMA');

            // Build .env file content from existing env vars
            const envFileContent = regularEnvVars
                .map(e => `${e.env_key}=${e.env_value}`)
                .join('\n');

            res.render('projects/edit', {
                title: `Edit ${project.name}`,
                project,
                dbSchema: dbSchema ? dbSchema.env_value : null,
                envFileContent: envFileContent || null
            });
        } catch (err) {
            next(err);
        }
    },

    // ── PUT: Update project ──────────────────────────────────────────
    async update(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.id);
            if (!project) {
                throw AppError.notFound('Project');
            }

            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can edit');
            }

            const { name, githubUrl, domain, description, dbSchema, envFile } = req.body;

            await Project.update(project.id, {
                name: name || undefined,
                githubUrl: githubUrl || undefined,
                domain: domain || undefined,
                description: description || undefined
            });

            // Update database schema
            if (dbSchema !== undefined) {
                if (dbSchema.trim()) {
                    await Environment.upsert(project.id, 'DB_SCHEMA', dbSchema.trim());
                } else {
                    // If empty, delete the DB_SCHEMA entry
                    const existing = await Environment.findByKey(project.id, 'DB_SCHEMA');
                    if (existing) {
                        await Environment.delete(existing.id);
                    }
                }
            }

            // Update .env file content
            if (envFile !== undefined) {
                // Remove existing non-DB_SCHEMA env vars
                const existingVars = await Environment.findByProjectId(project.id);
                for (const ev of existingVars) {
                    if (ev.env_key !== 'DB_SCHEMA') {
                        await Environment.delete(ev.id);
                    }
                }

                // Parse and insert new env vars
                if (envFile.trim()) {
                    const envVars = [];
                    const lines = envFile.split('\n');
                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || trimmed.startsWith('#')) continue;
                        const eqIndex = trimmed.indexOf('=');
                        if (eqIndex > 0) {
                            const key = trimmed.substring(0, eqIndex).trim();
                            const value = trimmed.substring(eqIndex + 1).trim();
                            if (key) {
                                envVars.push({ key, value });
                            }
                        }
                    }
                    if (envVars.length > 0) {
                        await Environment.bulkUpsert(project.id, envVars);
                    }
                }
            }

            res.redirect(`/projects/${project.id}`);
        } catch (err) {
            next(err);
        }
    },

    // ── DELETE: Delete project ───────────────────────────────────────
    async delete(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.id);
            if (!project) {
                throw AppError.notFound('Project');
            }

            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can delete');
            }

            await Project.delete(project.id);

            res.redirect('/dashboard');
        } catch (err) {
            next(err);
        }
    }
};

module.exports = projectController;