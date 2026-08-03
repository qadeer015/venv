// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const signToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, username: user.username, role: user.role },
        process.env.JWT_SECRET || process.env.SECRET_KEY,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );
};

const authController = {
    // ── GET: Show Login Page ─────────────────────────────────────────
    showLogin(req, res) {
        if (req.user) return res.redirect('/');
        res.render('auth/login', {
            title: 'Login',
            header: false,
            footer: false
        });
    },

    // ── GET: Show Register Page ──────────────────────────────────────
    showRegister(req, res) {
        if (req.user) return res.redirect('/');
        res.render('auth/register', {
            title: 'Create Account',
            header: false,
            footer: false
        });
    },

    // ── POST: Register ────────────────────────────────────────────────
    async register(req, res, next) {
        try {
            const { email, password, confirmPassword } = req.body;

            if (!email || !password) {
                throw AppError.badRequest('Email and password are required');
            }

            if (password.length < 8) {
                throw AppError.badRequest('Password must be at least 8 characters');
            }

            if (password !== confirmPassword) {
                throw AppError.badRequest('Passwords do not match');
            }

            // Check if user already exists
            const existingUser = await User.findByEmail(email);
            if (existingUser) {
                throw AppError.conflict('An account with this email already exists');
            }

            // Create user
            const userId = await User.create({ email, password });

            // Generate token
            const user = await User.findById(userId);
            const token = signToken(user);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.redirect('/onboarding');
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Login ──────────────────────────────────────────────────
    async login(req, res, next) {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                throw AppError.badRequest('Email and password are required');
            }

            const user = await User.findByEmail(email);
            if (!user) {
                throw AppError.unauthorized('Invalid email or password');
            }

            const isPasswordValid = await User.verifyPassword(password, user.password);
            if (!isPasswordValid) {
                throw AppError.unauthorized('Invalid email or password');
            }

            const token = signToken(user);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            // Redirect to onboarding if not onboarded, otherwise to dashboard
            if (!user.onboarded) {
                return res.redirect('/onboarding');
            }
            res.redirect('/');
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Logout ─────────────────────────────────────────────────
    logout(req, res) {
        res.clearCookie('token');
        res.redirect('/auth/login');
    }
};

module.exports = authController;