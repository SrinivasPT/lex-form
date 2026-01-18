const db = require('./database.service');
const QueryBuilder = require('../utils/query-builder');
const { NotFoundError, ValidationError } = require('../utils/errors');

/**
 * Form Service
 * Business logic for form operations
 */

/**
 * Get all forms
 * @returns {Promise<Array>} List of forms
 */
async function getAllForms() {
    const query = QueryBuilder.buildJsonQuery({
        table: 'dbo.form',
        columns: '*',
        orderBy: 'code, version',
    });

    return await db.queryJson(query);
}

/**
 * Get form by code and version
 * @param {string} code - Form code
 * @param {string} version - Form version
 * @returns {Promise<Object|null>} Form object or null
 */
async function getFormByCodeAndVersion(code, version) {
    const query = QueryBuilder.buildJsonQuery({
        table: 'dbo.form',
        columns: '*',
        where: { code, version },
        singleObject: true,
    });

    return await db.queryJson(query, { code, version }, true);
}

/**
 * Get form hierarchy - Complex query using database function
 * This is an example of Level 3 flexibility: custom SQL for complex scenarios
 * @param {string} formCode - Form code
 * @param {string} formVersion - Form version
 * @returns {Promise<Array>} Form hierarchy
 */
async function getFormHierarchy(formCode, formVersion) {
    // Complex recursive query - keep as is, wrap with utilities
    const query = `
        SELECT
            c.code,
            c.atomic_level_code,
            c.type,
            c.[key],
            c.label,
            c.placeholder,
            c.help_text,
            c.category_code,
            cg.sort_order,
            cg.width,
            cg.data_path,
            fc.parent_control_code,
            fc.level
        FROM dbo.form_control fc
        INNER JOIN dbo.control c ON fc.control_code = c.code
        LEFT JOIN dbo.control_group cg 
            ON fc.control_code = cg.child_control_code 
            AND fc.parent_control_code = cg.parent_control_code
        WHERE fc.form_code = @formCode 
          AND fc.form_version = @formVersion
        ORDER BY fc.level, cg.sort_order
        FOR JSON PATH
    `;

    return await db.queryJson(query, { formCode, formVersion });
}

/**
 * Create form
 * @param {Object} formData - Form data (accepts camelCase!)
 * @returns {Promise<Object>} Created form
 */
async function createForm(formData) {
    const { code, version, label, description } = formData;

    if (!code || !version || !label) {
        throw new ValidationError('Missing required fields: code, version, label');
    }

    // Check if form exists
    if (await db.exists('dbo.form', { code, version })) {
        throw new ValidationError(`Form '${code}' version '${version}' already exists`);
    }

    const query = `
        INSERT INTO dbo.form (code, version, label, description)
        VALUES (@code, @version, @label, @description)
    `;

    await db.executeQuery(query, { code, version, label, description: description || null });

    return await getFormByCodeAndVersion(code, version);
}

/**
 * Associate control with form
 * @param {string} formCode - Form code
 * @param {string} formVersion - Form version
 * @param {string} controlCode - Control code
 * @param {string} parentControlCode - Parent control code (null for root)
 * @returns {Promise<void>}
 */
async function associateControl(formCode, formVersion, controlCode, parentControlCode = null) {
    // Use stored procedure for complex hierarchy logic
    const query = `EXEC dbo.sp_AssociateControlWithForm @formCode, @formVersion, @controlCode, @parentControlCode`;

    await db.executeQuery(query, {
        formCode,
        formVersion,
        controlCode,
        parentControlCode,
    });
}

module.exports = {
    getAllForms,
    getFormByCodeAndVersion,
    getFormHierarchy,
    createForm,
    associateControl,
};
