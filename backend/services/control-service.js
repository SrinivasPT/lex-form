const db = require('./database.service');
const QueryBuilder = require('../utils/query-builder');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Control Service
 * Reusable business logic for control operations
 */

/**
 * Get control by code with all metadata
 * @param {string} code - Control code
 * @returns {Promise<Object|null>} Control object or null if not found
 */
async function getControlByCode(code) {
    const query = QueryBuilder.buildJsonQuery({
        table: 'dbo.control c',
        columns: '*', // Automatic camelCase conversion!
        where: { code },
        singleObject: true,
    });

    return await db.queryJson(query, { code }, true);
}

/**
 * Check if control exists
 * @param {string} code - Control code
 * @returns {Promise<boolean>}
 */
async function controlExists(code) {
    return await db.exists('dbo.control', { code });
}

/**
 * Get control's atomic level
 * @param {string} code - Control code
 * @returns {Promise<string|null>} Atomic level code or null if not found
 */
async function getControlAtomicLevel(code) {
    const query = 'SELECT atomic_level_code FROM dbo.control WHERE code = @code';
    const result = await db.executeQuery(query, { code });
    return result.recordset.length > 0 ? result.recordset[0].atomic_level_code : null;
}

// /**
//  * Check if control can be updated
//  * @param {string} code - Control code
//  * @returns {Promise<{canUpdate: boolean, reason?: string, atomicLevel?: string}>}
//  */
// async function canUpdateControl(code) {
//     const atomicLevel = await getControlAtomicLevel(code);

//     if (!atomicLevel) {
//         return { canUpdate: false, reason: 'Control not found' };
//     }

//     if (atomicLevel === 'COMPOSITE') {
//         return {
//             canUpdate: false,
//             reason: 'COMPOSITE controls cannot be updated',
//             atomicLevel,
//         };
//     }

//     return { canUpdate: true, atomicLevel };
// }

/**
 * Fields configuration for control updates
 * Specifies which table to update for each field (snake_case)
 */
const FIELD_CONFIG = {
    // Fields only in control table
    control: [
        'type',
        'key',
        'label',
        'placeholder',
        'help_text',
        'additional_settings',
        'source_table',
        'source_column',
        'source_data_type',
        'category_code',
        'dependent_on',
        'visible_when',
        'disabled_when',
        'required_when',
        'is_required',
        'is_readonly',
        'min_val',
        'max_val',
        'min_length',
        'max_length',
        'pattern',
        'properties_json',
    ],
    // Fields in both tables - update in control_group only
    control_group: ['width', 'sort_order', 'data_path'],
};

/**
 * Update control metadata
 * Handles updating fields in control and/or control_group tables
 * For BASE controls: only updates control_group table (width, data_path, sort_order)
 * For other controls: updates both control and control_group tables as needed
 * @param {string} code - Control code
 * @param {Object} updateData - Fields to update (accepts camelCase!)
 * @returns {Promise<Object>} Updated control object
 */
async function updateControl(code, updateData) {
    // Check if control exists and get atomic level
    const atomicLevel = await getControlAtomicLevel(code);
    if (!atomicLevel) {
        throw new NotFoundError('Control not found');
    }

    // Check if COMPOSITE (cannot be updated at all)
    if (atomicLevel === 'COMPOSITE') {
        throw new ValidationError('COMPOSITE controls cannot be updated');
    }

    // Automatic camelCase → snake_case conversion handled by DatabaseService!
    const controlUpdates = {};
    const controlGroupUpdates = {};

    // Distribute fields to appropriate tables
    for (const [field, value] of Object.entries(updateData)) {
        if (FIELD_CONFIG.control_group.includes(field)) {
            controlGroupUpdates[field] = value;
        } else if (FIELD_CONFIG.control.includes(field)) {
            controlUpdates[field] = value;
        }
    }

    // For BASE controls: skip control table updates, only update control_group
    if (atomicLevel !== 'BASE' && Object.keys(controlUpdates).length > 0) {
        const setClauses = Object.keys(controlUpdates)
            .map((f) => `${f} = @${f}`)
            .join(', ');
        const query = `UPDATE dbo.control SET ${setClauses} WHERE code = @code`;
        await db.executeQuery(query, { code, ...controlUpdates });
    }

    // Execute control_group table update if needed (applies to all atomic levels)
    if (Object.keys(controlGroupUpdates).length > 0) {
        const setClauses = Object.keys(controlGroupUpdates)
            .map((f) => `${f} = @${f}`)
            .join(', ');
        const query = `UPDATE dbo.control_group SET ${setClauses} WHERE child_control_code = @code`;
        await db.executeQuery(query, { code, ...controlGroupUpdates });
    }

    // Return updated control
    return await getControlByCode(code);
}

/**
 * Create new control
 * @param {Object} controlData - Control data (accepts camelCase!)
 * @returns {Promise<Object>} Created control object
 */
async function createControl(controlData) {
    const {
        code,
        atomicLevelCode,
        type,
        key,
        label,
        placeholder,
        helpText,
        sortOrder = 0,
        width,
        isRequired = 0,
        isReadonly = 0,
    } = controlData;

    // Validate required fields
    if (!code || !atomicLevelCode || !type || !label) {
        throw new ValidationError('Missing required fields: code, atomicLevelCode, type, label');
    }

    // Check restrictions
    if (atomicLevelCode === 'BASE' || atomicLevelCode === 'COMPOSITE') {
        throw new ValidationError(`Cannot create ${atomicLevelCode} controls via API`);
    }

    // Check if control already exists
    if (await controlExists(code)) {
        throw new ValidationError(`Control code '${code}' already exists`);
    }

    // Insert new control - automatic camelCase → snake_case conversion!
    const query = `
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
            @atomicLevelCode,
            @type,
            @key,
            @label,
            @placeholder,
            @helpText,
            @sortOrder,
            @width,
            @isRequired,
            @isReadonly
        )
    `;

    await db.executeQuery(query, {
        code,
        atomicLevelCode,
        type,
        key: key || null,
        label,
        placeholder: placeholder || null,
        helpText: helpText || null,
        sortOrder,
        width: width || null,
        isRequired,
        isReadonly,
    });

    // Return created control
    return await getControlByCode(code);
}

module.exports = {
    getControlByCode,
    controlExists,
    getControlAtomicLevel,
    // canUpdateControl,
    updateControl,
    createControl,
    FIELD_CONFIG,
};
