// utils/errorHandler.js
const multer = require('multer');
const AppError = require('./AppError');

const isProd = () => String(process.env.NODE_ENV || '').toLowerCase() === 'production';

/**
 * Decide whether the request is a "service / API" request and should get
 * a JSON response, or a "controller / web" request and should get an HTML
 * page rendered.
 */
const isApiRequest = (req) => {
    if (!req) return false;
    // Return JSON only when the caller EXPLICITLY asked for it:
    //   - XHR/fetch from the SPA frontend
    //   - Accept: application/json header
    //   - Content-Type: application/json (typical of programmatic POST/PUT)
    // Otherwise (including a user pasting '/api/...' into the browser
    // address bar) we render the friendly HTML error page.
    if (req.xhr) return true;
    if (req.headers && req.headers.accept && req.headers.accept.includes('application/json')) return true;
    if (req.get && req.get('content-type') && req.get('content-type').includes('application/json')) return true;
    return false;
};

/**
 * Map a few well-known library errors to AppError so we always return
 * sensible codes and messages.
 */
const normalizeError = (err) => {
    // Body-parser / express.json() invalid JSON
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return AppError.badRequest(`Invalid JSON payload: ${err.message}`);
    }

    // Multer file upload errors
    if (err instanceof multer.MulterError) {
        return AppError.badRequest(`File upload error: ${err.message}`);
    }

    // JWT
    if (err && err.name === 'JsonWebTokenError') {
        return AppError.unauthorized('Invalid token. Please log in again.');
    }
    if (err && err.name === 'TokenExpiredError') {
        return AppError.unauthorized('Token expired. Please log in again.');
    }

    // Mongoose / generic CastError
    if (err && err.name === 'CastError') {
        return AppError.badRequest(`Invalid ${err.path}: ${err.value}`);
    }

    // Mongo duplicate key
    if (err && err.code === 11000) {
        return AppError.conflict('Duplicate field value');
    }

    return err;
};

/**
 * Build the human-friendly title and message for the rendered error page.
 */
const buildErrorView = (err) => {
    const statusCode = err.statusCode || 500;
    const isNotFound = err.type === 'not_found' || statusCode === 404;
    const isServerError = statusCode >= 500;
    const showReal = !isProd() || err.isOperational === true;

    let title;
    let message;

    if (isNotFound) {
        title = err.resourceType
            ? `${err.resourceType} Not Found`
            : 'Page Not Found';
        message = err.message || 'The resource you are looking for does not exist.';
    } else if (isServerError) {
        title = 'Server Error';
        if (isProd() && !err.isOperational) {
            // hide internals in prod for non-operational errors
            message = 'Something went wrong on our end.';
        } else {
            message = err.message || 'Something went wrong on our end.';
        }
    } else {
        // 4xx (other)
        title = err.type === 'auth' ? 'Access Denied' : 'Request Error';
        message = err.message || 'Your request could not be processed.';
    }

    return {
        statusCode,
        isNotFound,
        isServerError,
        title,
        message,
        showReal
    };
};

/**
 * Global error-handling middleware. Express recognises it as error
 * middleware by its 4-argument signature.
 *
 * - For API requests -> JSON response.
 * - For web requests -> render the 'error' EJS view.
 * - 4xx errors are always safe to surface.
 * - 5xx errors: production hides internals unless the error is
 *   operational, development shows the real message + stack.
 */
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
    let error = normalizeError(err) || AppError.internal();

    // Make sure required fields are populated
    if (!error.statusCode) error.statusCode = 500;
    if (!error.type) error.type = error.statusCode >= 500 ? 'internal' : 'fail';

    // Logging
    if (isProd()) {
        // In prod, log full details only for non-operational / unexpected errors.
        if (!error.isOperational) {
            console.error('UNEXPECTED ERROR 💥', error);
        } else {
            console.warn(`Operational error [${error.statusCode}] ${error.type}: ${error.message}`);
        }
    } else {
        console.error('ERROR 💥', error);
    }

    const apiRequest = isApiRequest(req);

    if (apiRequest) {
        const isServerError = error.statusCode >= 500;
        const showReal = !isProd() || error.isOperational === true;
        const payload = {
            success: false,
            status: error.status || (isServerError ? 'error' : 'fail'),
            type: error.type,
            message: (isServerError && !showReal)
                ? 'Something went wrong'
                : error.message
        };
        if (!isProd()) {
            payload.stack = error.stack;
        }
        if (error.details) {
            payload.details = error.details;
        }
        if (error.resourceType) {
            payload.resourceType = error.resourceType;
        }
        return res.status(error.statusCode).json(payload);
    }

    // Web request -> render an HTML error page.
    const view = buildErrorView(error);

    // Pass sensible defaults that the existing views/error.ejs template
    // (and other error templates) already expect.
    return res.status(view.statusCode).render('error', {
        title: view.title,
        message: view.message,
        statusCode: view.statusCode,
        isNotFound: view.isNotFound,
        isServerError: view.isServerError,
        type: error.type,
        resourceType: error.resourceType,
        // Show stack trace only in development
        error: (!isProd() && error.stack) ? error.stack : null,
        // The existing view template checks `title === 'Page Not Found'` for
        // the 404 visual, but we also expose isNotFound for new templates.
        showDetails: !isProd(),
        redirect_url: req.get('Referrer') || (view.isNotFound ? '/' : '/'),
        header: view.isNotFound ? false : true,
        footer: view.isNotFound ? false : true,
        // Layout helpers used elsewhere in the app
        sidebar: false,
        isGenie: false,
        currentYear: new Date().getFullYear()
    });
};

/**
 * Catch-all 404 middleware. Place AFTER all routes but BEFORE the
 * errorHandler. It converts unmatched paths into a 404 AppError.
 */
const notFoundHandler = (req, res, next) => {
    next(AppError.notFound('Page', `The page "${req.originalUrl}" was not found.`));
};

module.exports = {
    errorHandler,
    notFoundHandler,
    isApiRequest,
    isProd
};
