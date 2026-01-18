/**
 * Database Service
 * Handles all database operations with automatic case conversion
 */

const sql = require('mssql');
const config = require('../config/database');
const logger = require('../config/logger');
const CaseConverter = require('../utils/case-converter');

class DatabaseService {
    constructor() {
        this.pool = null;
    }

    /**
     * Connect to database
     */
    async connect() {
        if (!this.pool) {
            this.pool = await sql.connect(config);
            logger.info('Database connected');
        }
        return this.pool;
    }

    /**
     * Connect with retry logic for resilience
     */
    async connectWithRetry(maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                if (!this.pool) {
                    this.pool = await sql.connect(config);
                    logger.info('Database connected', { attempt });
                }
                return this.pool;
            } catch (error) {
                logger.warn('Database connection failed', {
                    attempt,
                    maxRetries,
                    error: error.message,
                });

                if (attempt === maxRetries) {
                    throw new Error(
                        `Failed to connect after ${maxRetries} attempts: ${error.message}`
                    );
                }

                // Wait before retry with exponential backoff
                await new Promise((resolve) => setTimeout(resolve, delay * attempt));
            }
        }
    }

    /**
     * Execute parameterized query with automatic case conversion
     * @param {string} query - SQL query
     * @param {Object} params - Query parameters (camelCase or snake_case)
     * @returns {Promise<Object>} Query result
     */
    async executeQuery(query, params = {}) {
        const pool = await this.connect();
        const request = pool.request();

        // Convert camelCase params to snake_case for database
        const dbParams = CaseConverter.keysToSnakeCase(params);

        // Add parameters with type inference
        Object.entries(dbParams).forEach(([key, value]) => {
            request.input(key, this._inferSqlType(value), value);
        });

        try {
            return await request.query(query);
        } catch (error) {
            logger.error('Database query failed', {
                query: query.substring(0, 200),
                error: error.message,
            });
            throw error;
        }
    }

    /**
     * Parse JSON result from SQL Server with automatic camelCase conversion
     * @param {Object} result - Query result
     * @param {boolean} singleObject - Return single object vs array
     * @param {boolean} convertCase - Convert snake_case to camelCase (default: true)
     * @returns {*} Parsed JSON data with camelCase keys
     */
    parseJsonResult(result, singleObject = false, convertCase = true) {
        if (!result.recordset || result.recordset.length === 0) {
            return singleObject ? null : [];
        }

        const jsonKey = Object.keys(result.recordset[0])[0];
        const jsonString = result.recordset[0][jsonKey];

        if (!jsonString) {
            return singleObject ? null : [];
        }

        try {
            const parsed = JSON.parse(jsonString);
            // Automatically convert snake_case to camelCase for UI
            return convertCase ? CaseConverter.keysToCamelCase(parsed) : parsed;
        } catch (error) {
            logger.error('Failed to parse JSON result', { error: error.message });
            return singleObject ? null : [];
        }
    }

    /**
     * Execute query and parse JSON result with automatic camelCase conversion
     * Most common operation - combines executeQuery and parseJsonResult
     * @param {string} query - SQL query
     * @param {Object} params - Query parameters (accepts camelCase)
     * @param {boolean} singleObject - Return single object vs array
     * @returns {Promise<*>} Parsed result with camelCase keys
     */
    async queryJson(query, params = {}, singleObject = false) {
        const result = await this.executeQuery(query, params);
        return this.parseJsonResult(result, singleObject, true);
    }

    /**
     * Check if record exists
     * @param {string} table - Table name
     * @param {Object} where - Where clause conditions (accepts camelCase)
     * @returns {Promise<boolean>}
     */
    async exists(table, where) {
        const dbWhere = CaseConverter.keysToSnakeCase(where);
        const conditions = Object.keys(dbWhere)
            .map((key) => `${key} = @${key}`)
            .join(' AND ');
        const query = `SELECT 1 FROM ${table} WHERE ${conditions}`;
        const result = await this.executeQuery(query, where);
        return result.recordset.length > 0;
    }

    /**
     * Soft delete a record (sets deleted_at timestamp)
     * @param {string} table - Table name
     * @param {Object} where - Where conditions
     * @param {string} userId - User performing delete
     * @returns {Promise<boolean>}
     */
    async softDelete(table, where, userId = 'system') {
        const dbWhere = CaseConverter.keysToSnakeCase(where);
        const conditions = Object.keys(dbWhere)
            .map((key) => `${key} = @${key}`)
            .join(' AND ');

        const query = `
            UPDATE ${table} 
            SET deleted_at = GETDATE(), deleted_by = @deleted_by
            WHERE ${conditions} AND deleted_at IS NULL
        `;

        const result = await this.executeQuery(query, {
            ...dbWhere,
            deletedBy: userId,
        });

        return result.rowsAffected[0] > 0;
    }

    /**
     * Infer SQL type from JavaScript value
     * @private
     */
    _inferSqlType(value) {
        if (value === null || value === undefined) return sql.VarChar;
        if (typeof value === 'string') return sql.VarChar;
        if (typeof value === 'number') return Number.isInteger(value) ? sql.Int : sql.Float;
        if (typeof value === 'boolean') return sql.Bit;
        if (value instanceof Date) return sql.DateTime;
        return sql.VarChar;
    }

    /**
     * Close database connection
     */
    async close() {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
            logger.info('Database connection closed');
        }
    }
}

module.exports = new DatabaseService();
