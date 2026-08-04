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
            
            const [ownedProjects, sharedProjects, pendingRequests, pendingInvitations] = await Promise.all([
                Project.findByUserId(req.user.id),
                Project.findSharedWithUser(req.user.id),
                ProjectAccess.findPendingByOwner(req.user.id),
                ProjectAccess.findPendingInvitationsForUser(req.user.id)
            ]);

            // Fetch full user data to ensure username is available
            const user = await User.findById(req.user.id);

            res.render('dashboard/index', {
                title: 'Dashboard',
                user,
                ownedProjects,
                sharedProjects,
                pendingRequests,
                pendingInvitations
            });
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Show create project form ───────────────────────────────
    showCreate(req, res) {
        if (!req.user) return res.redirect('/auth/login');
        console.log('Rendering create project form for user:', req.user);
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

            // Fetch the created project to get its slug and user username
            const project = await Project.findById(projectId);
            const user = await User.findById(req.user.id);

            res.redirect(`/${user.username}/${project.slug}`);
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Get environment filter from query params (default to 'production')
            const selectedEnvironment = req.query.environment || 'production';
            const validEnvironments = ['development', 'staging', 'production'];
            const environmentFilter = validEnvironments.includes(selectedEnvironment) 
                ? selectedEnvironment 
                : 'production';

            // Check if user is owner or has approved access to the selected environment
            const isOwner = project.user_id === req.user.id;
            let access = null;
            let accessibleEnvironments = validEnvironments;
            if (!isOwner) {
                access = await ProjectAccess.hasAccess(project.id, req.user.id);
                if (!access) {
                    throw AppError.forbidden('You do not have access to this project');
                }
                accessibleEnvironments = access.environments || [];
                
                // If user doesn't have access to the selected environment, redirect to first accessible one
                if (!accessibleEnvironments.includes(environmentFilter)) {
                    const fallbackEnv = accessibleEnvironments[0] || 'production';
                    return res.redirect(`/${username}/${projectSlug}?environment=${fallbackEnv}`);
                }
            }

            // Fetch all environment variables and filter by selected environment
            const allEnvVars = await Environment.findByProjectId(project.id);
            const envVars = allEnvVars.filter(env => env.environment === environmentFilter);
            const accessList = isOwner ? await ProjectAccess.findByProjectId(project.id) : [];

            // Fetch owner info for display
            const owner = await User.findById(project.user_id);

            res.render('projects/show', {
                title: project.name,
                project,
                envVars,
                allEnvVars,
                accessList,
                isOwner,
                userAccess: access,
                owner,
                selectedEnvironment: environmentFilter,
                accessibleEnvironments
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Only owner can access settings
            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can access settings');
            }

            const envVars = await Environment.findByProjectId(project.id);
            const accessList = await ProjectAccess.findByProjectId(project.id);
            const owner = await User.findById(project.user_id);

            res.render('projects/settings', {
                title: `Settings - ${project.name}`,
                project,
                envVarsCount: envVars.length,
                accessList,
                isOwner: true,
                owner
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Only owner can edit
            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can edit');
            }

            const owner = await User.findById(project.user_id);

            res.render('projects/edit', {
                title: `Edit ${project.name}`,
                project,
                owner
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
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

            res.redirect(`/${username}/${projectSlug}`);
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can delete');
            }

            await Project.delete(project.id);

            res.redirect('/');
        } catch (err) {
            next(err);
        }
    }
};

module.exports = projectController;