// controllers/projectController.js
const Project = require('../models/Project');
const Environment = require('../models/Environment');
const ProjectAccess = require('../models/ProjectAccess');
const User = require('../models/User');
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

            const { name, githubUrl, domain, description } = req.body;

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

            // Fetch owner info for display
            const owner = await User.findById(project.user_id);

            res.render('projects/show', {
                title: project.name,
                project,
                envVars,
                accessList,
                isOwner,
                userAccess: access,
                owner
            });
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Show project settings page ─────────────────────────────
    async showSettings(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const project = await Project.findById(req.params.id);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Only owner can access settings
            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can access settings');
            }

            const envVars = await Environment.findByProjectId(project.id);
            const accessList = await ProjectAccess.findByProjectId(project.id);

            res.render('projects/settings', {
                title: `Settings - ${project.name}`,
                project,
                envVarsCount: envVars.length,
                accessList,
                isOwner: true
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

            res.render('projects/edit', {
                title: `Edit ${project.name}`,
                project
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

            const { name, githubUrl, domain, description } = req.body;

            await Project.update(project.id, {
                name: name || undefined,
                githubUrl: githubUrl || undefined,
                domain: domain || undefined,
                description: description || undefined
            });

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