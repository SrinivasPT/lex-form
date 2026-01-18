const db = require('./database.service');
const QueryBuilder = require('../utils/query-builder');

/**
 * Domain Service
 * Business logic for domain data operations
 */

/**
 * Get domain data by category
 * @param {string} categoryCode - Category code
 * @returns {Promise<Array>} Domain data list
 */
async function getDomainByCategory(categoryCode) {
    const query = QueryBuilder.buildJsonQuery({
        table: 'dbo.domain_data',
        columns: '*',
        where: { categoryCode },
        orderBy: 'sort_order',
    });

    return await db.queryJson(query, { categoryCode });
}

/**
 * Get all domain categories
 * @returns {Promise<Array>} List of categories
 */
async function getAllCategories() {
    const query = `
        SELECT DISTINCT category_code
        FROM dbo.domain_data
        ORDER BY category_code
        FOR JSON PATH
    `;

    return await db.queryJson(query);
}

module.exports = {
    getDomainByCategory,
    getAllCategories,
};
