/**
 * Error Handler Middleware
 * Centralized error handling with consistent responses
 */

const logger = require('../config/logger');
const ResponseFormatter = require('../utils/response');
const { AppError } = require('../utils/errors');

/**
 * Global error handler middleware
 * @param {Error} err - Error object
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
function errorHandler(err, req, res, next) {
    // Log error with context
    const errorContext = {
        method: req.method,
        path: req.path,
        body: req.body,
        params: req.params,
        query: req.query,
        error: err.message,
        stack: err.stack,
    };

    if (err instanceof AppError) {
        logger.warn('Application error', errorContext);
        return res
            .status(err.statusCode)
            .json(ResponseFormatter.error(err.message, err.statusCode));
    }

    // Database errors
    if (err.name === 'RequestError' || err.name === 'ConnectionError') {
        logger.error('Database error', errorContext);
        return res.status(500).json(ResponseFormatter.error('Database error', 500));
    }

    // Unhandled errors
    logger.error('Unhandled error', errorContext);
    res.status(500).json(ResponseFormatter.error('Internal server error', 500));
}

module.exports = errorHandler;
