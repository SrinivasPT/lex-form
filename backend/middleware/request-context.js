/**
 * Request Context Middleware
 * Adds request ID and timing information to each request
 */

const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Request context middleware
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {Function} next - Express next function
 */
function requestContext(req, res, next) {
    // Generate unique request ID
    req.id = uuidv4();
    req.startTime = Date.now();

    // Log incoming request
    logger.info(`${req.method} ${req.path}`, {
        requestId: req.id,
        method: req.method,
        path: req.path,
        query: req.query,
        ip: req.ip,
    });

    // Add response interceptor for logging
    const originalSend = res.send;
    res.send = function (data) {
        const duration = Date.now() - req.startTime;
        logger.info(`${req.method} ${req.path} completed`, {
            requestId: req.id,
            statusCode: res.statusCode,
            duration: `${duration}ms`,
        });
        originalSend.call(this, data);
    };

    next();
}

module.exports = requestContext;
