// controllers/accessController.js
const User = require('../models/User');
const Project = require('../models/Project');
const ProjectAccess = require('../models/ProjectAccess');
const AppError = require('../utils/AppError');

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week
const VALID_ENVIRONMENTS = ['development', 'staging', 'production'];

const accessController = {
    // ── POST: Request access to a project ───────────────────────────
    async requestAccess(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
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
                if (existing.status === 'invited' && (!existing.expires_at || new Date(existing.expires_at) > new Date())) {
                    throw AppError.badRequest('You have already been invited to this project');
                }
                // If rejected/declined/expired, allow re-request
            }

            await ProjectAccess.create({
                projectId: project.id,
                userId: req.user.id,
                permission: 'view',
                status: 'pending',
                environments: VALID_ENVIRONMENTS
            });

            res.redirect(`/${username}/${projectSlug}`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Invite user to project (owner action) ──────────────────
    async inviteUser(req, res, next) {
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
                throw AppError.forbidden('Only the project owner can invite users');
            }

            const { identifier, permission, environments } = req.body;

            if (!identifier || !identifier.trim()) {
                throw AppError.badRequest('Username or email is required');
            }

            // Validate environments
            let selectedEnvironments = [];
            if (environments) {
                selectedEnvironments = Array.isArray(environments) ? environments : [environments];
            }
            selectedEnvironments = selectedEnvironments.filter(e => VALID_ENVIRONMENTS.includes(e));
            if (selectedEnvironments.length === 0) {
                throw AppError.badRequest('Please select at least one environment');
            }

            // Search for user by email or username
            const targetUser = await User.findByEmailOrUsername(identifier.trim());
            if (!targetUser) {
                throw AppError.notFound('User', 'No user found with this username or email');
            }

            if (targetUser.id === req.user.id) {
                throw AppError.badRequest('You cannot invite yourself');
            }

            // Check if access/invitation already exists
            const existing = await ProjectAccess.exists(project.id, targetUser.id);
            if (existing) {
                if (existing.status === 'approved') {
                    throw AppError.badRequest('User already has access to this project');
                }
                if (
                    existing.status === 'invited' &&
                    (!existing.expires_at || new Date(existing.expires_at) > new Date())
                ) {
                    throw AppError.badRequest('User has already been invited');
                }
                // If pending/rejected/declined/expired, allow new invitation
                await ProjectAccess.delete(existing.id);
            }

            // Token-less invitation with a 1-week expiry
            const expiresAt = new Date(Date.now() + INVITATION_TTL_MS);

            await ProjectAccess.create({
                projectId: project.id,
                userId: targetUser.id,
                permission: permission || 'view',
                status: 'invited',
                expiresAt,
                environments: selectedEnvironments
            });

            req.session.success = 'Invitation sent successfully! The invite expires in 1 week.';
            res.redirect(`/${username}/${projectSlug}/settings`);
        } catch (err) {
            next(err);
        }
    },

    // ── GET: View invitation request page ───────────────────────────
    // Only accessible when the current user has a pending (non-expired)
    // invitation for this project. Otherwise a 404 is shown.
    async viewInvitations(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Load full user profile (req.user only carries JWT claims)
            const user = await User.findById(req.user.id);

            // The invitation page is only reachable if this user actually
            // has a pending invitation for this project.
            const invitation = await ProjectAccess.findPendingInvitation(project.id, user.id);
            if (!invitation) {
                throw AppError.notFound('Invitation', 'This invitation does not exist or has expired');
            }

            const owner = await User.findById(project.user_id);

            res.render('dashboard/invitations', {
                user,
                owner,
                project: { ...project, slug: projectSlug },
                invitation,
                projectContext: { username, projectSlug }
            });
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Accept invitation ─────────────────────────────────────
    async acceptInvitation(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            const user = await User.findById(req.user.id);

            const access = await ProjectAccess.findPendingInvitation(project.id, user.id);
            if (!access) {
                throw AppError.notFound('Invitation', 'This invitation does not exist or has expired');
            }

            await ProjectAccess.updateStatus(access.id, 'approved');

            const owner = await User.findById(project.user_id);

            req.session.success = 'You have accepted the invitation!';
            res.redirect(`/${owner.username}/${project.slug}`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Decline invitation ────────────────────────────────────
    async declineInvitation(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            const user = await User.findById(req.user.id);

            const access = await ProjectAccess.findPendingInvitation(project.id, user.id);
            if (!access) {
                throw AppError.notFound('Invitation', 'This invitation does not exist or has expired');
            }

            await ProjectAccess.updateStatus(access.id, 'declined');

            req.session.success = 'You have declined the invitation';
            res.redirect('/');
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can grant access');
            }

            const { email, permission, environments } = req.body;

            if (!email || !email.trim()) {
                throw AppError.badRequest('User email is required');
            }

            // Validate environments
            let selectedEnvironments = [];
            if (environments) {
                selectedEnvironments = Array.isArray(environments) ? environments : [environments];
            }
            selectedEnvironments = selectedEnvironments.filter(e => VALID_ENVIRONMENTS.includes(e));
            if (selectedEnvironments.length === 0) {
                throw AppError.badRequest('Please select at least one environment');
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
                status: 'approved',
                environments: selectedEnvironments
            });

            res.redirect(`/${username}/${projectSlug}/settings`);
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Only project owner can approve
            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can approve access requests');
            }

            const access = await ProjectAccess.findById(req.params.accessId);
            if (!access || access.project_id !== project.id) {
                throw AppError.notFound('Access request');
            }

            await ProjectAccess.updateStatus(access.id, 'approved');

            res.redirect(`/${username}/${projectSlug}/settings`);
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

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can reject access requests');
            }

            const access = await ProjectAccess.findById(req.params.accessId);
            if (!access || access.project_id !== project.id) {
                throw AppError.notFound('Access request');
            }

            await ProjectAccess.updateStatus(access.id, 'rejected');

            res.redirect(`/${username}/${projectSlug}/settings`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Update access environments (owner action) ─────────────
    async updateAccessEnvironments(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Only project owner can update access
            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can update access');
            }

            const access = await ProjectAccess.findById(req.params.accessId);
            if (!access || access.project_id !== project.id) {
                throw AppError.notFound('Access record');
            }

            const { permission, environments } = req.body;

            // Validate environments
            let selectedEnvironments = [];
            if (environments) {
                selectedEnvironments = Array.isArray(environments) ? environments : [environments];
            }
            selectedEnvironments = selectedEnvironments.filter(e => VALID_ENVIRONMENTS.includes(e));
            if (selectedEnvironments.length === 0) {
                throw AppError.badRequest('Please select at least one environment');
            }

            // Update permission if provided
            if (permission && ['view', 'edit'].includes(permission)) {
                await ProjectAccess.updatePermission(access.id, permission);
            }

            // Update environments
            await ProjectAccess.updateEnvironments(access.id, selectedEnvironments);

            req.session.success = 'Access updated successfully';
            res.redirect(`/${username}/${projectSlug}/settings`);
        } catch (err) {
            next(err);
        }
    },

    // ── DELETE: Revoke access (owner action) ───────────────────────
    async revokeAccess(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { username, projectSlug } = req.params;
            const project = await Project.findByUsernameAndSlug(username, projectSlug);
            if (!project) {
                throw AppError.notFound('Project');
            }

            // Only project owner can revoke
            if (project.user_id !== req.user.id) {
                throw AppError.forbidden('Only the project owner can revoke access');
            }

            const access = await ProjectAccess.findById(req.params.accessId);
            if (!access || access.project_id !== project.id) {
                throw AppError.notFound('Access record');
            }

            await ProjectAccess.delete(access.id);

            req.session.success = 'Access has been revoked';
            res.redirect(`/${username}/${projectSlug}/settings`);
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Search users by email or username (for inviting) ────────
    async searchUsers(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { q } = req.query;
            if (!q || q.length < 2) {
                return res.json([]);
            }

            const users = await User.searchByIdentifier(q, req.user.id);
            res.json(users);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = accessController;