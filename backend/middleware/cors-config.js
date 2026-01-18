/**
 * CORS Configuration Middleware
 */

const cors = require('cors');
const env = require('../config/environment');

/**
 * CORS configuration
 */
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, Postman, etc.)
        if (!origin) return callback(null, true);

        // In development, allow all origins
        if (env.nodeEnv === 'development') {
            return callback(null, true);
        }

        // In production, check against whitelist
        if (!env.corsOrigin) {
            return callback(new Error('CORS_ORIGIN not configured'));
        }
        const allowedOrigins = env.corsOrigin.split(',').map((o) => o.trim());
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};

module.exports = cors(corsOptions);
