/**
 * Query Builder Utility
 * Simplifies SQL query construction with automatic JSON PATH formatting
 * NO manual column mapping needed - automatic case conversion!
 */

const CaseConverter = require('./case-converter');

class QueryBuilder {
    /**
     * Build a SELECT query with automatic JSON PATH formatting
     * @param {Object} options
     * @param {string} options.table - Table name
     * @param {Array<string>|string|Object} options.columns - Column names or '*'
     * @param {Object} options.where - Where conditions (accepts camelCase)
     * @param {string} options.orderBy - Order by clause
     * @param {boolean} options.singleObject - Use WITHOUT_ARRAY_WRAPPER
     * @returns {string} SQL query
     */
    static buildJsonQuery({ table, columns = '*', where, orderBy, singleObject = false }) {
        let columnList;

        if (columns === '*') {
            // Select all columns - camelCase conversion happens in parseJsonResult
            columnList = '*';
        } else if (Array.isArray(columns)) {
            // Array of column names - no manual mapping needed!
            columnList = columns.join(',\n                ');
        } else if (typeof columns === 'object') {
            // Backward compatibility: object mapping { dbColumn: 'alias' }
            columnList = Object.entries(columns)
                .map(([dbCol, alias]) => `${dbCol} AS ${alias}`)
                .join(',\n                ');
        } else {
            columnList = columns;
        }

        let query = `SELECT\n                ${columnList}\n            FROM ${table}`;

        if (where && Object.keys(where).length > 0) {
            // Convert camelCase keys to snake_case for WHERE clause
            const dbWhere = CaseConverter.keysToSnakeCase(where);
            const conditions = Object.keys(dbWhere)
                .map((key) => `${key} = @${key}`)
                .join(' AND ');
            query += `\n            WHERE ${conditions}`;
        }

        if (orderBy) {
            query += `\n            ORDER BY ${orderBy}`;
        }

        query += '\n            FOR JSON PATH';
        if (singleObject) {
            query += ', WITHOUT_ARRAY_WRAPPER';
        }

        return query;
    }
}

module.exports = QueryBuilder;
