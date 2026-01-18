const express = require('express');
const domainService = require('../services/domain.service');
const { asyncHandler } = require('../utils/errors');
const ResponseFormatter = require('../utils/response');

const router = express.Router();

/**
 * GET /api/domains/categories
 * Get all domain categories
 */
router.get(
    '/categories',
    asyncHandler(async (req, res) => {
        const categories = await domainService.getAllCategories();
        res.json(ResponseFormatter.success(categories));
    }),
);

/**
 * GET /api/domains/:categoryCode
 * Get domain data by category
 */
router.get(
    '/:categoryCode',
    asyncHandler(async (req, res) => {
        const { categoryCode } = req.params;
        const { parentCode } = req.query;

        // If parentCode is provided, use legacy query format
        if (parentCode !== undefined) {
            const db = require('../services/database.service');
            const query = `
            SELECT
                code,
                display_text AS displayText,
                parent_code AS parentCode,
                extension_json AS extension
            FROM dbo.domain_data
            WHERE category_code = @category_code
            AND is_active = 1
            AND (@parent_code IS NULL OR parent_code = @parent_code)
            ORDER BY sort_order
            FOR JSON PATH
            `;

            const result = await db.queryJson(query, {
                categoryCode,
                parentCode: parentCode || null,
            });
            return res.json(result);
        }

        const data = await domainService.getDomainByCategory(categoryCode);
        res.json(ResponseFormatter.success(data));
    }),
);

module.exports = router;
