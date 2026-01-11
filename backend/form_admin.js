const express = require('express');
const sql = require('mssql');

const router = express.Router();

/**
 * Form Admin API Endpoints
 * Handles CRUD operations for form metadata management
 */

// ============================================
// GET /controls - Get all controls
// ============================================
router.get('/controls', async (req, res) => {
    try {
        const query = `
            SELECT
                code,
                atomic_level_code AS atomicLevelCode,
                type,
                [key],
                label,
                sort_order AS sortOrder
            FROM dbo.control
            ORDER BY atomic_level_code, type, code
            FOR JSON PATH
        `;

        const result = await sql.query(query);
        let controls = [];
        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            const jsonString = result.recordset[0][jsonKey];
            try {
                controls = JSON.parse(jsonString);
            } catch (e) {
                console.error('Invalid JSON from query:', e);
                controls = [];
            }
        }
        res.json(controls);
    } catch (err) {
        console.error('Error fetching controls:', err);
        res.status(500).json({ error: 'Failed to fetch controls', details: err.message });
    }
});

// ============================================
// POST /control - Create new control
// ============================================
router.post('/control', async (req, res) => {
    try {
        const {
            code,
            atomic_level_code,
            type,
            key,
            label,
            placeholder,
            help_text,
            sort_order = 0,
            width,
            is_required = 0,
            is_readonly = 0,
        } = req.body;

        // Validate required fields
        if (!code || !atomic_level_code || !type || !label) {
            return res.status(400).json({
                error: 'Missing required fields',
                required: ['code', 'atomic_level_code', 'type', 'label'],
            });
        }

        // Check if control code already exists
        const checkQuery = `SELECT code FROM dbo.control WHERE code = @code`;
        const checkRequest = new sql.Request();
        checkRequest.input('code', sql.VarChar, code);
        const checkResult = await checkRequest.query(checkQuery);

        if (checkResult.recordset.length > 0) {
            return res.status(409).json({
                error: 'Control code already exists',
                code: code,
            });
        }

        // Insert new control
        const insertQuery = `
            INSERT INTO dbo.control (
                code,
                atomic_level_code,
                type,
                [key],
                label,
                placeholder,
                help_text,
                sort_order,
                width,
                is_required,
                is_readonly
            )
            VALUES (
                @code,
                @atomic_level_code,
                @type,
                @key,
                @label,
                @placeholder,
                @help_text,
                @sort_order,
                @width,
                @is_required,
                @is_readonly
            );
            
            SELECT
                code,
                atomic_level_code AS atomicLevelCode,
                type,
                [key],
                label,
                placeholder,
                help_text AS helpText,
                sort_order AS sortOrder,
                width,
                is_required AS isRequired,
                is_readonly AS isReadonly
            FROM dbo.control
            WHERE code = @code
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const request = new sql.Request();
        request.input('code', sql.VarChar, code);
        request.input('atomic_level_code', sql.VarChar, atomic_level_code);
        request.input('type', sql.VarChar, type);
        request.input('key', sql.VarChar, key || null);
        request.input('label', sql.NVarChar, label);
        request.input('placeholder', sql.NVarChar, placeholder || null);
        request.input('help_text', sql.NVarChar, help_text || null);
        request.input('sort_order', sql.Int, sort_order);
        request.input('width', sql.NVarChar, width || null);
        request.input('is_required', sql.Bit, is_required);
        request.input('is_readonly', sql.Bit, is_readonly);

        const result = await request.query(insertQuery);

        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            const createdControl = JSON.parse(result.recordset[0][jsonKey]);
            res.status(201).json(createdControl);
        } else {
            res.status(500).json({ error: 'Failed to create control' });
        }
    } catch (err) {
        console.error('Error creating control:', err);
        res.status(500).json({ error: 'Failed to create control', details: err.message });
    }
});

// ============================================
// PUT /control/:code - Update control metadata
// ============================================
router.put('/control/:code', async (req, res) => {
    try {
        const { code } = req.params;
        const updateData = req.body;

        // Check if control exists
        const checkQuery = `SELECT code FROM dbo.control WHERE code = @code`;
        const checkRequest = new sql.Request();
        checkRequest.input('code', sql.VarChar, code);
        const checkResult = await checkRequest.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Control not found', code: code });
        }

        // Build dynamic update query based on provided fields
        const allowedFields = {
            type: sql.VarChar,
            key: sql.VarChar,
            label: sql.NVarChar,
            placeholder: sql.NVarChar,
            help_text: sql.NVarChar,
            sort_order: sql.Int,
            width: sql.NVarChar,
            additional_settings: sql.NVarChar,
            source_table: sql.VarChar,
            source_column: sql.VarChar,
            source_data_type: sql.VarChar,
            category_code: sql.VarChar,
            dependent_on: sql.VarChar,
            visible_when: sql.NVarChar,
            disabled_when: sql.NVarChar,
            required_when: sql.NVarChar,
            is_required: sql.Bit,
            is_readonly: sql.Bit,
            min_val: sql.Int,
            max_val: sql.Int,
            min_length: sql.Int,
            max_length: sql.Int,
            pattern: sql.NVarChar,
            properties_json: sql.NVarChar,
        };

        const updates = [];
        const request = new sql.Request();
        request.input('code', sql.VarChar, code);

        for (const [field, sqlType] of Object.entries(allowedFields)) {
            if (field in updateData) {
                updates.push(`${field} = @${field}`);
                request.input(field, sqlType, updateData[field]);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ error: 'No valid fields to update' });
        }

        const updateQuery = `
            UPDATE dbo.control
            SET ${updates.join(', ')}
            WHERE code = @code;
            
            SELECT
                code,
                atomic_level_code AS atomicLevelCode,
                type,
                [key],
                label,
                placeholder,
                help_text AS helpText,
                sort_order AS sortOrder,
                width,
                is_required AS isRequired,
                is_readonly AS isReadonly
            FROM dbo.control
            WHERE code = @code
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const result = await request.query(updateQuery);

        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            const updatedControl = JSON.parse(result.recordset[0][jsonKey]);
            res.json(updatedControl);
        } else {
            res.status(500).json({ error: 'Failed to update control' });
        }
    } catch (err) {
        console.error('Error updating control:', err);
        res.status(500).json({ error: 'Failed to update control', details: err.message });
    }
});

// ============================================
// POST /control-group - Create control associations (bulk)
// ============================================
router.post('/control-group', async (req, res) => {
    try {
        const { control_code, child_control_codes, data_path, width } = req.body;

        // Validate required fields
        if (!control_code || !child_control_codes || !Array.isArray(child_control_codes)) {
            return res.status(400).json({
                error: 'Missing or invalid required fields',
                required: {
                    control_code: 'string',
                    child_control_codes: 'array of strings',
                },
            });
        }

        if (child_control_codes.length === 0) {
            return res.status(400).json({ error: 'child_control_codes array is empty' });
        }

        // Check if parent control exists
        const checkParentQuery = `SELECT code FROM dbo.control WHERE code = @code`;
        const checkParentRequest = new sql.Request();
        checkParentRequest.input('code', sql.VarChar, control_code);
        const parentResult = await checkParentRequest.query(checkParentQuery);

        if (parentResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Parent control not found', code: control_code });
        }

        // Get current max sort_order for this parent
        const maxSortQuery = `
            SELECT ISNULL(MAX(sort_order), -1) AS maxSort
            FROM dbo.control_group
            WHERE control_code = @control_code
        `;
        const maxSortRequest = new sql.Request();
        maxSortRequest.input('control_code', sql.VarChar, control_code);
        const maxSortResult = await maxSortRequest.query(maxSortQuery);
        let nextSortOrder = maxSortResult.recordset[0].maxSort + 1;

        const createdAssociations = [];
        const errors = [];

        for (const child_code of child_control_codes) {
            try {
                // Check if child control exists
                const checkChildQuery = `SELECT code FROM dbo.control WHERE code = @code`;
                const checkChildRequest = new sql.Request();
                checkChildRequest.input('code', sql.VarChar, child_code);
                const childResult = await checkChildRequest.query(checkChildQuery);

                if (childResult.recordset.length === 0) {
                    errors.push({ child_code, error: 'Child control not found' });
                    continue;
                }

                // Check if association already exists
                const checkAssocQuery = `
                    SELECT control_code, child_control_code
                    FROM dbo.control_group
                    WHERE control_code = @parent AND child_control_code = @child
                `;
                const checkAssocRequest = new sql.Request();
                checkAssocRequest.input('parent', sql.VarChar, control_code);
                checkAssocRequest.input('child', sql.VarChar, child_code);
                const assocResult = await checkAssocRequest.query(checkAssocQuery);

                if (assocResult.recordset.length > 0) {
                    errors.push({ child_code, error: 'Association already exists' });
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
                        @control_code,
                        @child_control_code,
                        @data_path,
                        @width,
                        @sort_order
                    )
                `;

                const insertRequest = new sql.Request();
                insertRequest.input('control_code', sql.VarChar, control_code);
                insertRequest.input('child_control_code', sql.VarChar, child_code);
                insertRequest.input('data_path', sql.VarChar, data_path || null);
                insertRequest.input('width', sql.NVarChar, width || null);
                insertRequest.input('sort_order', sql.Int, nextSortOrder);

                await insertRequest.query(insertQuery);

                createdAssociations.push({
                    control_code,
                    child_control_code: child_code,
                    sort_order: nextSortOrder,
                });

                nextSortOrder++;
            } catch (err) {
                console.error(`Error creating association for ${child_code}:`, err);
                errors.push({ child_code, error: err.message });
            }
        }

        res.status(201).json({
            success: true,
            created: createdAssociations.length,
            total: child_control_codes.length,
            associations: createdAssociations,
            errors: errors.length > 0 ? errors : undefined,
        });
    } catch (err) {
        console.error('Error creating control associations:', err);
        res.status(500).json({
            error: 'Failed to create control associations',
            details: err.message,
        });
    }
});

// ============================================
// DELETE /control-group/:parent/:child - Delete association
// ============================================
router.delete('/control-group/:parent/:child', async (req, res) => {
    try {
        const { parent, child } = req.params;

        // Check if association exists
        const checkQuery = `
            SELECT control_code, child_control_code
            FROM dbo.control_group
            WHERE control_code = @parent AND child_control_code = @child
        `;
        const checkRequest = new sql.Request();
        checkRequest.input('parent', sql.VarChar, parent);
        checkRequest.input('child', sql.VarChar, child);
        const checkResult = await checkRequest.query(checkQuery);

        if (checkResult.recordset.length === 0) {
            return res.status(404).json({
                error: 'Association not found',
                parent,
                child,
            });
        }

        // Delete association
        const deleteQuery = `
            DELETE FROM dbo.control_group
            WHERE control_code = @parent AND child_control_code = @child
        `;
        const deleteRequest = new sql.Request();
        deleteRequest.input('parent', sql.VarChar, parent);
        deleteRequest.input('child', sql.VarChar, child);
        await deleteRequest.query(deleteQuery);

        res.json({
            success: true,
            message: 'Association deleted successfully',
            parent,
            child,
        });
    } catch (err) {
        console.error('Error deleting association:', err);
        res.status(500).json({
            error: 'Failed to delete association',
            details: err.message,
        });
    }
});

// ============================================
// GET /control/:code/can-delete - Check if control can be deleted
// ============================================
router.get('/control/:code/can-delete', async (req, res) => {
    try {
        const { code } = req.params;

        // Get control info
        const controlQuery = `
            SELECT code, atomic_level_code, type
            FROM dbo.control
            WHERE code = @code
        `;
        const controlRequest = new sql.Request();
        controlRequest.input('code', sql.VarChar, code);
        const controlResult = await controlRequest.query(controlQuery);

        if (controlResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Control not found', code });
        }

        const control = controlResult.recordset[0];

        // BASE controls: Can always "delete" (removes association only)
        if (control.atomic_level_code === 'BASE') {
            return res.json({
                canDelete: true,
                deletesAssociation: true,
                deletesControl: false,
                reason: 'BASE control deletion removes association only',
            });
        }

        // For SECTION/TAB/GROUP: Check parent and child associations
        const associationQuery = `
            SELECT
                (SELECT COUNT(*) FROM dbo.control_group WHERE child_control_code = @code) AS parentCount,
                (SELECT COUNT(*) FROM dbo.control_group WHERE control_code = @code) AS childCount
        `;
        const assocRequest = new sql.Request();
        assocRequest.input('code', sql.VarChar, code);
        const assocResult = await assocRequest.query(associationQuery);

        const { parentCount, childCount } = assocResult.recordset[0];

        if (parentCount > 0 || childCount > 0) {
            return res.json({
                canDelete: false,
                deletesAssociation: false,
                deletesControl: false,
                reason: `Control has ${parentCount} parent association(s) and ${childCount} child association(s)`,
                parentCount,
                childCount,
            });
        }

        // Can delete control from table
        res.json({
            canDelete: true,
            deletesAssociation: false,
            deletesControl: true,
            reason: 'Control has no associations and can be deleted',
        });
    } catch (err) {
        console.error('Error checking delete eligibility:', err);
        res.status(500).json({
            error: 'Failed to check delete eligibility',
            details: err.message,
        });
    }
});

// ============================================
// DELETE /control/:code - Delete control
// ============================================
router.delete('/control/:code', async (req, res) => {
    try {
        const { code } = req.params;

        // Check if can delete
        const canDeleteRequest = new sql.Request();
        canDeleteRequest.input('code', sql.VarChar, code);

        // Get control info
        const controlQuery = `
            SELECT code, atomic_level_code, type
            FROM dbo.control
            WHERE code = @code
        `;
        const controlResult = await canDeleteRequest.query(controlQuery);

        if (controlResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Control not found', code });
        }

        const control = controlResult.recordset[0];

        // BASE controls: Delete association only
        if (control.atomic_level_code === 'BASE') {
            // Find and delete all associations where this is a child
            const deleteAssocQuery = `
                DELETE FROM dbo.control_group
                WHERE child_control_code = @code
            `;
            const deleteAssocRequest = new sql.Request();
            deleteAssocRequest.input('code', sql.VarChar, code);
            const deleteResult = await deleteAssocRequest.query(deleteAssocQuery);

            return res.json({
                success: true,
                message: 'BASE control associations removed',
                deletedAssociations: deleteResult.rowsAffected[0],
                deletedControl: false,
            });
        }

        // For SECTION/TAB/GROUP: Check associations
        const associationQuery = `
            SELECT
                (SELECT COUNT(*) FROM dbo.control_group WHERE child_control_code = @code) AS parentCount,
                (SELECT COUNT(*) FROM dbo.control_group WHERE control_code = @code) AS childCount
        `;
        const assocRequest = new sql.Request();
        assocRequest.input('code', sql.VarChar, code);
        const assocResult = await assocRequest.query(associationQuery);

        const { parentCount, childCount } = assocResult.recordset[0];

        if (parentCount > 0 || childCount > 0) {
            return res.status(400).json({
                error: 'Cannot delete control',
                reason: `Control has ${parentCount} parent association(s) and ${childCount} child association(s)`,
                parentCount,
                childCount,
            });
        }

        // Delete control from table
        const deleteQuery = `DELETE FROM dbo.control WHERE code = @code`;
        const deleteRequest = new sql.Request();
        deleteRequest.input('code', sql.VarChar, code);
        await deleteRequest.query(deleteQuery);

        res.json({
            success: true,
            message: 'Control deleted successfully',
            deletedControl: true,
            code,
        });
    } catch (err) {
        console.error('Error deleting control:', err);
        res.status(500).json({
            error: 'Failed to delete control',
            details: err.message,
        });
    }
});

module.exports = router;
