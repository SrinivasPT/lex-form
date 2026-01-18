/**
 * Custom Error Classes and Error Handling Utilities
 */

class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404);
    }
}

class ConflictError extends AppError {
    constructor(message) {
        super(message, 409);
    }
}

class ForbiddenError extends AppError {
    constructor(message) {
        super(message, 403);
    }
}

class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(message, 500, false);
        this.originalError = originalError;
    }
}

/**
 * Async error wrapper for Express route handlers
 * Eliminates try-catch boilerplate
 */
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    ConflictError,
    ForbiddenError,
    DatabaseError,
    asyncHandler,
};
