// controllers/profileController.js
const User = require('../models/User');
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
    // ── GET: Show user profile page ──────────────────────────────────
    async showProfile(req, res, next) {
        try {
            if (!req.user) return res.redirect('/auth/login');

            // Fetch full user data from DB
            const user = await User.findById(req.user.id);
            if (!user) {
                throw AppError.notFound('User');
            }
            console.log('Rendering profile page for user:', AVATARS);
            res.render('profile/index', {
                title: 'Profile',
                user,
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