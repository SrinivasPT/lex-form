const express = require('express');
const db = require('../services/database.service');
const { asyncHandler } = require('../utils/errors');
const ResponseFormatter = require('../utils/response');

const router = express.Router();

/**
 * Legacy routes - kept for backwards compatibility
 * TODO: Migrate these to new service-based architecture
 */

// GET /form/:formCode - Get form schema with fn_GetControlChildren
router.get(
    '/form/:formCode',
    asyncHandler(async (req, res) => {
        const { formCode } = req.params;
        const query = `
        SELECT
            f.code,
            f.version,
            f.label,
            JSON_QUERY((
                SELECT
                    c.code,
                    c.atomic_level_code AS atomicLevelCode,
                    c.type,
                    c.[key],
                    c.label,
                    c.placeholder,
                    c.help_text AS helpText,
                    c.sort_order AS sortOrder,
                    c.width,
                    c.visible_when AS visibleWhen,
                    c.disabled_when AS disabledWhen,
                    c.is_required AS required,
                    c.is_readonly AS readonly,
                    c.properties_json AS properties,
                    c.guid,
                    JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
                FROM dbo.control c
                WHERE c.form_code = f.code
                    AND c.parent_control_code IS NULL
                    AND c.atomic_level_code = 'SECTION'
                ORDER BY c.sort_order
                FOR JSON PATH
            )) AS sections
        FROM dbo.form f
        WHERE f.code = @form_code
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const result = await db.queryJson(query, { formCode });
        if (!result || result.length === 0) {
            return res
                .status(404)
                .json(ResponseFormatter.error(`Form '${formCode}' not found`, 404));
        }
        res.json(result[0]);
    }),
);

// GET /domain/:domainCode - Get domain data
router.get(
    '/domain/:domainCode',
    asyncHandler(async (req, res) => {
        const { domainCode } = req.params;
        const { parentCode } = req.query;

        const query = `
        SELECT
            code,
            display_text AS displayText,
            parent_code AS parentCode,
            extension_json AS extension
        FROM dbo.domain_data
        WHERE category_code = @domain_code
        AND is_active = 1
        AND (@parent_code IS NULL OR parent_code = @parent_code)
        ORDER BY sort_order
        FOR JSON PATH
        `;

        const result = await db.queryJson(query, { domainCode, parentCode: parentCode || null });
        res.json(result);
    }),
);

// GET /control/:controlCode - Get control with children
router.get(
    '/control/:controlCode',
    asyncHandler(async (req, res) => {
        const { controlCode } = req.params;

        const query = `
        SELECT
            c.code,
            c.atomic_level_code AS atomicLevelCode,
            c.type,
            c.[key],
            c.label,
            c.placeholder,
            c.help_text AS helpText,
            c.sort_order AS sortOrder,
            c.width,
            c.source_table AS sourceTable,
            c.source_column AS sourceColumn,
            c.source_data_type AS sourceDataType,
            c.category_code AS categoryCode,
            c.dependent_on AS dependentOn,
            c.visible_when AS visibleWhen,
            c.disabled_when AS disabledWhen,
            c.required_when AS requiredWhen,
            c.is_required AS required,
            c.is_readonly AS readonly,
            c.min_val AS min,
            c.max_val AS max,
            c.min_length AS minLength,
            c.max_length AS maxLength,
            c.pattern,
            c.properties_json AS properties,
            c.guid,
            JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
        FROM dbo.control c
        WHERE c.code = @control_code
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const result = await db.queryJson(query, { controlCode });
        if (result.length > 0) {
            res.json(result[0]);
        } else {
            res.status(404).json(ResponseFormatter.error('Control not found', 404));
        }
    }),
);

// GET /form/hierarchy/:rootControl - Get control hierarchy with CTE
router.get(
    '/form/hierarchy/:rootControl',
    asyncHandler(async (req, res) => {
        const { rootControl } = req.params;

        const query = `
        WITH ControlHierarchy AS (
            -- Start with the root control
            SELECT
                c.code,
                CONCAT(COALESCE(c.label, c.[key], c.code), ' (', c.type, ')') AS displayText,
                c.type,
                c.[key],
                c.sort_order,
                CAST(NULL AS VARCHAR(128)) AS parentCode,
                0 AS level,
                CAST(c.code AS VARCHAR(MAX)) AS path
            FROM dbo.control c
            WHERE c.form_code = @root_control

            UNION ALL

            -- Child controls with their parents (from control_group)
            SELECT
                c.code,
                CONCAT(COALESCE(c.label, c.[key], c.code), ' (', c.type, ')') AS displayText,
                c.type,
                c.[key],
                c.sort_order,
                cg.control_code AS parentCode,
                ch.level + 1 AS level,
                CAST(ch.path + '/' + c.code AS VARCHAR(MAX)) AS path
            FROM dbo.control c
            INNER JOIN dbo.control_group cg ON c.code = cg.child_control_code
            INNER JOIN ControlHierarchy ch ON cg.control_code = ch.code
        )
        SELECT
            code,
            displayText,
            type,
            [key],
            parentCode,
            level,
            path,
            sort_order
        FROM ControlHierarchy
        ORDER BY path, sort_order
        FOR JSON PATH
        `;

        const result = await db.queryJson(query, { rootControl });
        res.json(result);
    }),
);

// Mock employee routes
router.get('/api/employee/:id', (req, res) => {
    const { id } = req.params;
    const mockEmployees = {
        EMP_001: {
            employee: {
                id: 'EMP_001',
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                dateOfBirth: '1985-06-15',
                isMarried: true,
                age: 38,
            },
        },
    };
    const employee = mockEmployees[id];
    if (employee) {
        res.json(employee);
    } else {
        res.status(404).json(ResponseFormatter.error('Employee not found', 404));
    }
});

router.put('/api/employee/:id', (req, res) => {
    res.json(ResponseFormatter.success({ id: req.params.id }, 'Employee data saved successfully'));
});

module.exports = router;
