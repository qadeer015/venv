// middlewares/authenticate.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Authentication middleware that supports JWT
 * - Checks for JWT token in cookies, Authorization header, or query string
 * - Verifies user account is not deleted
 * - Sets req.user from decoded token
 */
const authenticate = async (req, res, next) => {
    // First, try to authenticate via JWT token
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1] || req.query.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SECRET_KEY);
            
            // Check if user account still exists and is not deleted
            const user = await User.findById(decoded.id);
            if (!user) {
                res.clearCookie('token');
                if (req.originalUrl.startsWith('/api')) {
                    return res.status(401).json({
                        status: 'error',
                        message: 'Account no longer exists'
                    });
                }
                return res.redirect('/auth/login');
            }
            
            if (user.status === 'deleted') {
                res.clearCookie('token');
                if (req.originalUrl.startsWith('/api')) {
                    return res.status(403).json({
                        status: 'error',
                        message: 'Account has been deleted'
                    });
                }
                return res.redirect('/auth/login');
            }
            
            req.user = user;
            return next();
        } catch (err) {
            // Token is invalid, clear cookie and continue
            res.clearCookie('token');
            console.log('JWT verification failed:', err.message);
        }
    }
    
    // No valid authentication found
    if (req.originalUrl.startsWith('/api')) {
        return res.status(401).json({ status: 'error', message: 'Access required! Please log in' });
    }

    return res.redirect('/auth/login');
};

/**
 * Optional authentication - sets user if authenticated via JWT,
 * but doesn't block if not authenticated
 */
const optionalAuthenticate = async (req, res, next) => {
    // Try JWT token first
    const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1] || req.query.token;

    if (token) {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET || process.env.SECRET_KEY);
            
            // Fetch full user from DB to get latest data (avatar, name, etc.)
            const user = await User.findById(decoded.id);
            if (user && user.status === 'active') {
                req.user = user;
            }
            return next();
        } catch (err) {
            // Token invalid, continue without error
        }
    }

    // No authentication, but that's okay for optional auth
    next();
};


module.exports = {
    authenticate,
    optionalAuthenticate
};