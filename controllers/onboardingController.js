// controllers/onboardingController.js
const User = require('../models/User');
const AppError = require('../utils/AppError');

const onboardingController = {
    // ── GET: Show Onboarding Page ────────────────────────────────────
    showOnboarding(req, res) {
        if (!req.user) return res.redirect('/auth/login');
        res.render('onboarding/index', {
            title: 'Complete Your Profile',
            header: false,
            footer: false
        });
    },

    // ── POST: Complete Onboarding ────────────────────────────────────
    async completeOnboarding(req, res, next) {
        try {
            if (!req.user) {
                throw AppError.unauthorized();
            }

            const { name, username, organization } = req.body;

            if (!name || !name.trim()) {
                throw AppError.badRequest('Name is required');
            }

            if (!username || !username.trim()) {
                throw AppError.badRequest('Username is required');
            }

            // Check username uniqueness
            const existingUser = await User.findByUsername(username);
            if (existingUser && existingUser.id !== req.user.id) {
                throw AppError.conflict('Username is already taken');
            }

            await User.updateProfile(req.user.id, {
                name: name.trim(),
                username: username.trim().toLowerCase(),
                organization: organization ? organization.trim() : null
            });

            res.redirect('/dashboard');
        } catch (err) {
            next(err);
        }
    }
};

module.exports = onboardingController;