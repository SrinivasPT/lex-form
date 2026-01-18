const express = require('express');
const db = require('./services/database.service');
const errorHandler = require('./middleware/error-handler');
const corsConfig = require('./middleware/cors-config');
const requestContext = require('./middleware/request-context');
const logger = require('./config/logger');

// Import routes
const controlRoutes = require('./routes/controls');
const formRoutes = require('./routes/forms');
const domainRoutes = require('./routes/domains');
const employeeRoutes = require('./routes/employees');

/**
 * Create and configure Express application
 */
function createApp() {
    const app = express();

    // Middleware
    app.use(express.json());
    app.use(corsConfig);
    app.use(requestContext);

    // Health check endpoint
    app.get('/health', (req, res) => {
        res.json({ status: 'ok', timestamp: new Date().toISOString() });
    });

    // API routes
    app.use('/api/controls', controlRoutes);
    app.use('/api/forms', formRoutes);
    app.use('/api/domains', domainRoutes);
    app.use('/api/employees', employeeRoutes);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    return app;
}

/**
 * Initialize database connection and start server
 */
async function startServer(port = 3000) {
    try {
        // Initialize database connection
        await db.connectWithRetry();
        logger.info('Database connected successfully');

        // Create and start Express app
        const app = createApp();
        const server = app.listen(port, () => {
            logger.info(`Server running on port ${port}`);
            logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
        });

        // Graceful shutdown
        process.on('SIGTERM', () => {
            logger.info('SIGTERM signal received: closing HTTP server');
            server.close(() => {
                logger.info('HTTP server closed');
                process.exit(0);
            });
        });

        return server;
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

module.exports = { createApp, startServer };
