const express = require('express');
const controlService = require('../services/control-service');
const { asyncHandler } = require('../utils/errors');
const ResponseFormatter = require('../utils/response');
const ValidationHelper = require('../utils/validation');

const router = express.Router();

/**
 * GET /api/controls
 * Get all controls
 */
router.get(
    '/',
    asyncHandler(async (req, res) => {
        const db = require('../services/database.service');
        const QueryBuilder = require('../utils/query-builder');

        const query = QueryBuilder.buildJsonQuery({
            table: 'dbo.control',
            columns: ['code', 'atomic_level_code', 'type', '[key]', 'label', 'sort_order'],
            orderBy: 'atomic_level_code, type, code',
        });

        const controls = await db.queryJson(query);
        res.json(controls);
    }),
);

/**
 * GET /api/controls/:code
 * Get control by code
 */
router.get(
    '/:code',
    asyncHandler(async (req, res) => {
        const { code } = req.params;
        const { includeChildren } = req.query;

        // If includeChildren is requested, use legacy format with fn_GetControlChildren
        if (includeChildren === 'true') {
            const db = require('../services/database.service');
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
            WHERE c.code = @code
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
            `;

            const result = await db.queryJson(query, { code });
            if (!result || result.length === 0) {
                return res.status(404).json(ResponseFormatter.error('Control not found', 404));
            }
            return res.json(ResponseFormatter.success(result));
        }

        const control = await controlService.getControlByCode(code);

        if (!control) {
            return res.status(404).json(ResponseFormatter.error('Control not found', 404));
        }

        res.json(ResponseFormatter.success(control));
    }),
);

/**
 * POST /api/controls
 * Create new control
 */
router.post(
    '/',
    ValidationHelper.createMiddleware(ValidationHelper.schemas.control),
    asyncHandler(async (req, res) => {
        const control = await controlService.createControl(req.body);
        res.status(201).json(ResponseFormatter.created(control));
    }),
);

/**
 * PUT /api/controls/:code
 * Update control
 */
router.put(
    '/:code',
    asyncHandler(async (req, res) => {
        const { code } = req.params;

        // Check if control can be updated
        const canUpdate = await controlService.canUpdateControl(code);
        if (!canUpdate.canUpdate) {
            return res.status(403).json(ResponseFormatter.error(canUpdate.reason, 403));
        }

        const control = await controlService.updateControl(code, req.body);
        res.json(ResponseFormatter.success(control, 'Control updated successfully'));
    }),
);

/**
 * GET /api/controls/:code/exists
 * Check if control exists
 */
router.get(
    '/:code/exists',
    asyncHandler(async (req, res) => {
        const { code } = req.params;
        const exists = await controlService.controlExists(code);
        res.json(ResponseFormatter.success({ exists }));
    }),
);

/**
 * GET /api/controls/:code/can-delete
 * Check if control can be deleted
 */
router.get(
    '/:code/can-delete',
    asyncHandler(async (req, res) => {
        const db = require('../services/database.service');
        const { code } = req.params;

        // Get control info
        const query = 'SELECT code, atomic_level_code, type FROM dbo.control WHERE code = @code';
        const result = await db.executeQuery(query, { code });

        if (result.recordset.length === 0) {
            return res.status(404).json(ResponseFormatter.error('Control not found', 404));
        }

        const control = result.recordset[0];

        // BASE controls: Can always "delete" (removes association only)
        if (control.atomic_level_code === 'BASE') {
            return res.json(
                ResponseFormatter.success({
                    canDelete: true,
                    deletesAssociation: true,
                    deletesControl: false,
                    reason: 'BASE control deletion removes association only',
                }),
            );
        }

        // For SECTION/TAB/GROUP: Check parent and child associations
        const associationQuery = `
            SELECT
                (SELECT COUNT(*) FROM dbo.control_group WHERE child_control_code = @code) AS parentCount,
                (SELECT COUNT(*) FROM dbo.control_group WHERE control_code = @code) AS childCount
        `;
        const assocResult = await db.executeQuery(associationQuery, { code });
        const { parentCount, childCount } = assocResult.recordset[0];

        if (parentCount > 0 || childCount > 0) {
            return res.json(
                ResponseFormatter.success({
                    canDelete: false,
                    deletesAssociation: false,
                    deletesControl: false,
                    reason: `Control has ${parentCount} parent association(s) and ${childCount} child association(s)`,
                    parentCount,
                    childCount,
                }),
            );
        }

        // Can delete control from table
        res.json(
            ResponseFormatter.success({
                canDelete: true,
                deletesAssociation: false,
                deletesControl: true,
                reason: 'Control has no associations and can be deleted',
            }),
        );
    }),
);

/**
 * DELETE /api/controls/:code
 * Delete control or its associations
 */
router.delete(
    '/:code',
    asyncHandler(async (req, res) => {
        const db = require('../services/database.service');
        const { code } = req.params;

        // Get control info
        const query = 'SELECT code, atomic_level_code, type FROM dbo.control WHERE code = @code';
        const result = await db.executeQuery(query, { code });

        if (result.recordset.length === 0) {
            return res.status(404).json(ResponseFormatter.error('Control not found', 404));
        }

        const control = result.recordset[0];

        // BASE controls: Delete association only
        if (control.atomic_level_code === 'BASE') {
            const deleteAssocQuery = `
                DELETE FROM dbo.control_group
                WHERE child_control_code = @code
            `;
            const deleteResult = await db.executeQuery(deleteAssocQuery, { code });

            return res.json(
                ResponseFormatter.success(
                    {
                        deletedAssociations: deleteResult.rowsAffected[0],
                        deletedControl: false,
                    },
                    'BASE control associations removed',
                ),
            );
        }

        // For SECTION/TAB/GROUP: Check associations
        const associationQuery = `
            SELECT
                (SELECT COUNT(*) FROM dbo.control_group WHERE child_control_code = @code) AS parentCount,
                (SELECT COUNT(*) FROM dbo.control_group WHERE control_code = @code) AS childCount
        `;
        const assocResult = await db.executeQuery(associationQuery, { code });
        const { parentCount, childCount } = assocResult.recordset[0];

        if (parentCount > 0 || childCount > 0) {
            return res.status(400).json(
                ResponseFormatter.error('Cannot delete control', 400, {
                    reason: `Control has ${parentCount} parent association(s) and ${childCount} child association(s)`,
                    parentCount,
                    childCount,
                }),
            );
        }

        // Delete control from table
        const deleteQuery = `DELETE FROM dbo.control WHERE code = @code`;
        await db.executeQuery(deleteQuery, { code });

        res.json(
            ResponseFormatter.success(
                {
                    deletedControl: true,
                    code,
                },
                'Control deleted successfully',
            ),
        );
    }),
);

/**
 * POST /api/controls/:code/children
 * Create control associations (add children to a parent control)
 */
router.post(
    '/:code/children',
    asyncHandler(async (req, res) => {
        const db = require('../services/database.service');
        const { code: parentCode } = req.params;
        const { childControlCodes, dataPath, width } = req.body;

        // Validate required fields
        if (!childControlCodes || !Array.isArray(childControlCodes)) {
            return res.status(400).json(
                ResponseFormatter.error('Missing or invalid required fields', 400, {
                    required: {
                        childControlCodes: 'array of strings',
                    },
                }),
            );
        }

        if (childControlCodes.length === 0) {
            return res
                .status(400)
                .json(ResponseFormatter.error('childControlCodes array is empty', 400));
        }

        // Check if parent control exists
        if (!(await db.exists('dbo.control', { code: parentCode }))) {
            return res.status(404).json(ResponseFormatter.error('Parent control not found', 404));
        }

        // Get current max sort_order for this parent
        const maxSortQuery = `
            SELECT ISNULL(MAX(sort_order), -1) AS maxSort
            FROM dbo.control_group
            WHERE control_code = @controlCode
        `;
        const maxResult = await db.executeQuery(maxSortQuery, { controlCode: parentCode });
        let nextSortOrder = maxResult.recordset[0].maxSort + 1;

        const createdAssociations = [];
        const errors = [];

        for (const childCode of childControlCodes) {
            try {
                // Check if child control exists
                if (!(await db.exists('dbo.control', { code: childCode }))) {
                    errors.push({ childCode, error: 'Child control not found' });
                    continue;
                }

                // Check if association already exists
                if (
                    await db.exists('dbo.control_group', {
                        controlCode: parentCode,
                        childControlCode: childCode,
                    })
                ) {
                    errors.push({ childCode, error: 'Association already exists' });
                    continue;
                }

                // Create association
                const insertQuery = `
                    INSERT INTO dbo.control_group (
                        control_code,
                        child_control_code,
                        data_path,
                        width,
                        sort_order
                    )
                    VALUES (
                        @controlCode,
                        @childControlCode,
                        @dataPath,
                        @width,
                        @sortOrder
                    )
                `;

                await db.executeQuery(insertQuery, {
                    controlCode: parentCode,
                    childControlCode: childCode,
                    dataPath: dataPath || null,
                    width: width || null,
                    sortOrder: nextSortOrder,
                });

                createdAssociations.push({
                    controlCode: parentCode,
                    childControlCode: childCode,
                    sortOrder: nextSortOrder,
                });

                nextSortOrder++;
            } catch (err) {
                errors.push({ childCode, error: err.message });
            }
        }

        res.status(201).json(
            ResponseFormatter.success({
                created: createdAssociations.length,
                total: childControlCodes.length,
                associations: createdAssociations,
                errors: errors.length > 0 ? errors : undefined,
            }),
        );
    }),
);

/**
 * DELETE /api/controls/:parent/children/:child
 * Delete control association
 */
router.delete(
    '/:parent/children/:child',
    asyncHandler(async (req, res) => {
        const db = require('../services/database.service');
        const { parent, child } = req.params;

        // Check if association exists
        if (
            !(await db.exists('dbo.control_group', {
                controlCode: parent,
                childControlCode: child,
            }))
        ) {
            return res.status(404).json(ResponseFormatter.error('Association not found', 404));
        }

        // Delete association
        const deleteQuery = `
            DELETE FROM dbo.control_group
            WHERE control_code = @controlCode AND child_control_code = @childControlCode
        `;
        await db.executeQuery(deleteQuery, { controlCode: parent, childControlCode: child });

        res.json(ResponseFormatter.success({ parent, child }, 'Association deleted successfully'));
    }),
);

module.exports = router;
