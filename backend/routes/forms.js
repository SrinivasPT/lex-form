const express = require('express');
const formService = require('../services/form.service');
const { asyncHandler } = require('../utils/errors');
const ResponseFormatter = require('../utils/response');
const ValidationHelper = require('../utils/validation');

const router = express.Router();

/**
 * GET /api/forms
 * Get all forms
 */
router.get(
    '/',
    asyncHandler(async (req, res) => {
        const forms = await formService.getAllForms();
        res.json(ResponseFormatter.success(forms));
    }),
);

/**
 * GET /api/forms/:formCode/schema
 * Get form schema with sections and controls (legacy format)
 * NOTE: This must be BEFORE /:code/:version to avoid route conflicts
 */
router.get(
    '/:formCode/schema',
    asyncHandler(async (req, res) => {
        const db = require('../services/database.service');
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

        if (!result || (typeof result === 'object' && Object.keys(result).length === 0)) {
            return res
                .status(404)
                .json(ResponseFormatter.error(`Form '${formCode}' not found`, 404));
        }

        // Result is already the object we need (due to WITHOUT_ARRAY_WRAPPER)
        res.json(result);
    }),
);

/**
 * GET /api/forms/:formCode/hierarchy
 * Get form control hierarchy with CTE
 * NOTE: This must be BEFORE /:code/:version/hierarchy to avoid route conflicts
 */
router.get(
    '/:formCode/hierarchy',
    asyncHandler(async (req, res) => {
        const db = require('../services/database.service');
        const { formCode } = req.params;

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
            WHERE c.form_code = @form_code

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

        const result = await db.queryJson(query, { formCode });
        res.json(result);
    }),
);

/**
 * GET /api/forms/:code/:version
 * Get form by code and version
 */
router.get(
    '/:code/:version',
    asyncHandler(async (req, res) => {
        const { code, version } = req.params;
        const form = await formService.getFormByCodeAndVersion(code, version);

        if (!form) {
            return res.status(404).json(ResponseFormatter.error('Form not found', 404));
        }

        res.json(ResponseFormatter.success(form));
    }),
);

/**
 * GET /api/forms/:code/:version/hierarchy
 * Get form hierarchy by code and version
 */
router.get(
    '/:code/:version/hierarchy',
    asyncHandler(async (req, res) => {
        const { code, version } = req.params;
        const hierarchy = await formService.getFormHierarchy(code, version);
        res.json(ResponseFormatter.success(hierarchy));
    }),
);

/**
 * POST /api/forms
 * Create new form
 */
router.post(
    '/',
    ValidationHelper.createMiddleware(ValidationHelper.schemas.form),
    asyncHandler(async (req, res) => {
        const form = await formService.createForm(req.body);
        res.status(201).json(ResponseFormatter.created(form));
    }),
);

/**
 * POST /api/forms/:code/:version/controls
 * Associate control with form
 */
router.post(
    '/:code/:version/controls',
    asyncHandler(async (req, res) => {
        const { code, version } = req.params;
        const { controlCode, parentControlCode } = req.body;

        await formService.associateControl(code, version, controlCode, parentControlCode);
        res.json(ResponseFormatter.success(null, 'Control associated successfully'));
    }),
);

module.exports = router;
