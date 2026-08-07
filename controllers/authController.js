// controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const OTP_STORE = require('../utils/otpStore');

const signToken = (user) => {
    return jwt.sign(
        { id: user.id, email: user.email, username: user.username, role: user.role, avatar: user.avatar || null },
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
    },

    // ── GET: Show Forgot Password Page ───────────────────────────────
    showForgotPassword(req, res) {
        if (req.user) return res.redirect('/dashboard');
        res.render('auth/forgot-password', {
            title: 'Forgot Password',
            header: false,
            footer: false,
            error: null,
            success: null
        });
    },

    // ── GET: Show Verify OTP Page ────────────────────────────────────
    showVerifyOtp(req, res) {
        if (req.user) return res.redirect('/dashboard');

        const { email } = req.query;
        if (!email) {
            return res.redirect('/auth/forgot-password');
        }

        // Check if there's an active OTP for this email
        const otpData = OTP_STORE.get(email);
        if (!otpData) {
            // OTP expired or doesn't exist - render page with expired state
            return res.render('auth/verify-otp', {
                title: 'Verify OTP',
                header: false,
                footer: false,
                email,
                error: 'OTP has expired. Please request a new one.',
                otpExpiresAt: null
            });
        }

        res.render('auth/verify-otp', {
            title: 'Verify OTP',
            header: false,
            footer: false,
            email,
            error: null,
            otpExpiresAt: otpData.expiresAt
        });
    },

    // ── POST: Send OTP ───────────────────────────────────────────────
    async sendOtp(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                throw AppError.badRequest('Email is required');
            }

            // Check if user exists
            const user = await User.findByEmail(email);
            if (!user) {
                throw AppError.notFound('User', 'No account found with this email address');
            }

            // Generate 6-digit OTP
            const otp = Math.floor(100000 + Math.random() * 900000).toString();

            // Store OTP in memory with 1 minute expiry
            OTP_STORE.set(email, otp, 60000);

            // Print OTP to console (in production, send via email)
            console.log('========================================');
            console.log(`OTP for ${email}: ${otp}`);
            console.log(`Expires at: ${new Date(Date.now() + 60000).toLocaleTimeString()}`);
            console.log('========================================');

            // Redirect to verify-otp page (GET request so page refresh works)
            res.redirect(`/auth/verify-otp?email=${encodeURIComponent(email)}`);
        } catch (err) {
            next(err);
        }
    },

    // ── POST: Verify OTP ─────────────────────────────────────────────
    async verifyOtp(req, res, next) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                throw AppError.badRequest('Email and OTP are required');
            }

            if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
                throw AppError.badRequest('OTP must be a 6-digit number');
            }

            // Verify OTP
            const isValid = OTP_STORE.verify(email, otp);

            if (!isValid) {
                // Check if OTP expired or never existed
                const remainingTime = OTP_STORE.getRemainingTime(email);
                if (remainingTime <= 0) {
                    return res.render('auth/verify-otp', {
                        title: 'Verify OTP',
                        header: false,
                        footer: false,
                        email,
                        error: 'OTP has expired. Please request a new one.',
                        otpExpiresAt: null
                    });
                }
                return res.render('auth/verify-otp', {
                    title: 'Verify OTP',
                    header: false,
                    footer: false,
                    email,
                    error: 'Invalid OTP. Please try again.',
                    otpExpiresAt: Date.now() + (remainingTime * 1000)
                });
            }

            // Generate a temporary reset token (short-lived JWT)
            const resetToken = jwt.sign(
                { email, purpose: 'password-reset' },
                process.env.JWT_SECRET || process.env.SECRET_KEY,
                { expiresIn: '5m' }
            );

            // Redirect to reset password page
            res.redirect(`/auth/reset-password?token=${resetToken}`);
        } catch (err) {
            next(err);
        }
    },

    // ── GET: Show Reset Password Page ────────────────────────────────
    showResetPassword(req, res) {
        if (req.user) return res.redirect('/dashboard');
        console.log("req.query.token", req.query.token);
        const { token } = req.query;
        if (!token) {
            return res.redirect('/auth/forgot-password');
        }

        try {
            // Verify the reset token
            const decoded = jwt.verify(
                token,
                process.env.JWT_SECRET || process.env.SECRET_KEY
            );

            if (decoded.purpose !== 'password-reset') {
                return res.redirect('/auth/forgot-password');
            }

            res.render('auth/reset-password', {
                title: 'Reset Password',
                header: false,
                footer: false,
                token,
                error: null,
                success: null
            });
        } catch (err) {
            // Token expired or invalid
            return res.redirect('/auth/forgot-password');
        }
    },

    // ── POST: Reset Password ─────────────────────────────────────────
    async resetPassword(req, res, next) {
        try {
            const { token, password, confirmPassword } = req.body;

            if (!token || !password || !confirmPassword) {
                throw AppError.badRequest('All fields are required');
            }

            if (password.length < 8) {
                throw AppError.badRequest('Password must be at least 8 characters');
            }

            if (password !== confirmPassword) {
                throw AppError.badRequest('Passwords do not match');
            }

            // Verify the reset token
            let decoded;
            try {
                decoded = jwt.verify(
                    token,
                    process.env.JWT_SECRET || process.env.SECRET_KEY
                );
            } catch (err) {
                return res.render('auth/reset-password', {
                    title: 'Reset Password',
                    header: false,
                    footer: false,
                    token,
                    error: 'This reset link has expired. Please request a new one.',
                    success: null
                });
            }

            if (decoded.purpose !== 'password-reset') {
                throw AppError.badRequest('Invalid reset token');
            }

            // Find user by email
            const user = await User.findByEmail(decoded.email);
            if (!user) {
                throw AppError.notFound('User', 'User not found');
            }

            // Update password
            await User.updatePassword(user.id, password);

            res.render('auth/reset-password', {
                title: 'Reset Password',
                header: false,
                footer: false,
                token: null,
                error: null,
                success: 'Password has been reset successfully. You can now login with your new password.'
            });
        } catch (err) {
            next(err);
        }
    }
};

module.exports = authController;