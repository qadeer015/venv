// controllers/profileController.js
const User = require('../models/User');
const Project = require('../models/Project');
const ProjectAccess = require('../models/ProjectAccess');

const AppError = require('../utils/AppError');

// List of available avatars
const AVATARS = [
    '/avatars/Avatar1.svg',
    '/avatars/Avatar2.svg',
    '/avatars/Avatar3.svg',
    '/avatars/Avatar4.svg',
    '/avatars/Avatar5.svg'
];

const profileController = {

    // ── GET: Dashboard - List all projects ──────────────────────────
    async dashboard(req, res, next) {
        try {
            if (!req.user) return res.render('landing');

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
                pendingInvitations,
                avatars: AVATARS
            });
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Update user avatar ─────────────────────────────────────
    async updateAvatar(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { avatar } = req.body;

            // Validate avatar is one of the allowed options
            if (!avatar || !AVATARS.includes(avatar)) {
                throw AppError.badRequest('Invalid avatar selection');
            }

            await User.updateAvatar(req.user.id, avatar);

            req.session.success = 'Avatar updated successfully!';
            res.redirect(`/${req.user.username}`);
        } catch (err) {
            next(err);
        }
    }
};

module.exports = profileController;