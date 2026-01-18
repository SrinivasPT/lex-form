/**
 * Logger Configuration
 * Winston-based structured logging
 */

const winston = require('winston');
const env = require('./environment');

const logger = winston.createLogger({
    level: env.logging.level,
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.printf(({ level, message, timestamp, ...meta }) => {
                    let msg = `${timestamp} [${level}]: ${message}`;
                    if (Object.keys(meta).length > 0) {
                        msg += ` ${JSON.stringify(meta)}`;
                    }
                    return msg;
                })
            ),
        }),
    ],
});

// Override console methods in production
if (env.NODE_ENV === 'production') {
    console.log = (...args) => logger.info(args.join(' '));
    console.error = (...args) => logger.error(args.join(' '));
    console.warn = (...args) => logger.warn(args.join(' '));
}

module.exports = logger;
