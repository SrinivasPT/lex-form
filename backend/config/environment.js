/**
 * Environment Configuration
 * Centralized configuration from environment variables
 */

require('dotenv').config();

// Required environment variables
const required = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

required.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

module.exports = {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT) || 3001,
    corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:4200',

    database: {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT) || 1433,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    },

    logging: {
        level: process.env.LOG_LEVEL || 'info',
    },

    performance: {
        slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD) || 1000,
    },
};
