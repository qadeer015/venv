// utils/AppError.js
/**
 * AppError
 * ------------------------------------------------------------------
 * Generic, framework-agnostic error class for the whole app.
 *
 * Usage in services (backend / business logic):
 *   const { AppError } = require('../utils/AppError');
 *   throw AppError.notFound('Post');        // -> "Post not found", 404
 *   throw AppError.badRequest('Invalid id');
 *
 * Usage in controllers:
 *   try { ... } catch (e) { return next(e); }   // the global errorHandler
 *                                              // middleware renders the right
 *                                              // response (HTML page or JSON)
 *                                              // based on the request type.
 *
 * Behaviour
 *   - 4xx errors are "operational" -> safe to surface to clients.
 *   - 5xx errors in production show a generic message; the full
 *     message/stack is only shown in development.
 *   - The error object carries `type` and `resourceType` so the renderer
 *     can build nice titles (e.g. "Post Not Found" vs "Page Not Found").
 */
class AppError extends Error {
    /**
     * @param {string}  message     Human-readable error message
     * @param {number}  statusCode  HTTP status code (default 500)
     * @param {string}  type        Logical error type (not_found|validation|auth|conflict|internal|...)
     */
    constructor(message, statusCode = 500, type = 'internal') {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        // 'fail' for 4xx, 'error' for 5xx
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
        this.isOperational = true;
        this.type = type;
        this.resourceType = null;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Tag the error with a resource name (e.g. 'Post', 'User') so the
     * renderer can build titles like "Post Not Found".
     */
    setResourceType(resourceType) {
        this.resourceType = resourceType;
        return this;
    }

    // ------------------- Factories -------------------

    /**
     * 400 - validation / bad request
     */
    static badRequest(message = 'Bad request', details) {
        const err = new AppError(message, 400, 'validation');
        if (details) err.details = details;
        return err;
    }

    /**
     * 401 - authentication required
     */
    static unauthorized(message = 'Authentication required') {
        return new AppError(message, 401, 'auth');
    }

    /**
     * 403 - authenticated but not allowed
     */
    static forbidden(message = 'Access denied') {
        return new AppError(message, 403, 'auth');
    }

    /**
     * 404 - resource / page not found
     * @param {string} resourceType e.g. 'Post', 'User', 'Page'
     * @param {string} [message]    optional override
     */
    static notFound(resourceType = 'Resource', message) {
        const msg = message || `${resourceType} not found`;
        const err = new AppError(msg, 404, 'not_found');
        err.resourceType = resourceType;
        return err;
    }

    /**
     * 409 - conflict (e.g. duplicate)
     */
    static conflict(message = 'Conflict') {
        return new AppError(message, 409, 'conflict');
    }

    /**
     * 500 - internal server error
     */
    static internal(message = 'Internal server error') {
        return new AppError(message, 500, 'internal');
    }
}

module.exports = AppError;
module.exports.AppError = AppError;
