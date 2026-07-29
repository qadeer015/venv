// middlewares/authorize.js
const isJsonRequest = (req) => {
    return req.xhr
        || req.originalUrl?.startsWith('/api')
        || req.headers.accept?.includes('application/json')
        || req.get('content-type')?.includes('application/json');
};

const getRequestedResourceId = (req) => {
    return req.params.studentId
        || req.params.userId
        || req.body?.studentId
        || req.body?.user_id
        || req.query?.studentId
        || req.query?.userId
        || req.query?.user_id
        || req.user?.studentId
        || req.user?.id
        || null;
};

const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        const wantsJson = isJsonRequest(req);

        if (!req.user) {
            if (wantsJson) {
                return res.status(401).json({
                    success: false,
                    message: 'Access denied. User not authenticated.'
                });
            }
            return res.redirect('/auth/login');
        }

        const userRole = String(req.user.role || 'student').toLowerCase();
        console.log('Authorizing user with role:', userRole, 'against allowed roles:', allowedRoles);
        if (!allowedRoles.includes(userRole)) {
            if (wantsJson) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. Insufficient permissions.'
                });
            }
            return res.status(403).render('error', {
                message: 'You do not have permission to access this page.',
                title: 'Access Denied',
                redirect_url: req.get('Referer') || '/'
            })
        }

        if (userRole === 'student' || userRole === 'author') {
            const requestedStudentId = getRequestedResourceId(req);
            console.log('Requested resource ID:', requestedStudentId, 'Current user student ID:', req.user.studentId);
            // If no specific resource is being requested, allow it
            if (requestedStudentId === null) return next();

            const currentStudentId = String(req.user.studentId || req.user.id || '');

            if (String(requestedStudentId).toLowerCase() !== currentStudentId.toLowerCase()) {
                if (wantsJson) {
                    return res.status(403).json({
                        success: false,
                        message: 'Access denied. You can only access your own data.'
                    });
                }
                return res.status(403).render('error', {
                    message: 'You do not have permission to access this page.',
                    title: 'Access Denied',
                    redirect_url: req.get('Referer') || '/'
                });
            }
        }

        next();
    };
};

const canAccessUser = (req, res, next) => {
    const requestedUserId = req.params.userId || req.body.user_id;
    const user = req.user;

    if (!requestedUserId) {
        return next();
    }

    if (user.role === 'admin') return next();
    if ((user.role === 'student' || user.role === 'author') && String(user.studentId) === String(requestedUserId)) return next();

    return res.status(403).json({
        success: false,
        message: 'Access denied. You cannot access this resource.'
    });
};

module.exports = {
    authorize,
    canAccessUser
};