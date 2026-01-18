/**
 * Validation Helper Utility
 * Schema-based validation to reduce repetitive validation code
 */

const { ValidationError } = require('./errors');

class ValidationHelper {
    /**
     * Validate data against schema
     * @param {Object} data - Data to validate
     * @param {Object} schema - Validation schema
     * @throws {ValidationError}
     */
    static validate(data, schema) {
        const errors = [];

        for (const [field, rules] of Object.entries(schema)) {
            const value = data[field];

            // Required check
            if (rules.required && (value === undefined || value === null || value === '')) {
                errors.push(`${field} is required`);
                continue;
            }

            // Skip other validations if not required and empty
            if (!rules.required && !value) continue;

            // Type check
            if (rules.type && typeof value !== rules.type) {
                errors.push(`${field} must be of type ${rules.type}`);
            }

            // Enum check
            if (rules.enum && !rules.enum.includes(value)) {
                errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
            }

            // Min/max for numbers
            if (rules.min !== undefined && value < rules.min) {
                errors.push(`${field} must be at least ${rules.min}`);
            }
            if (rules.max !== undefined && value > rules.max) {
                errors.push(`${field} must be at most ${rules.max}`);
            }

            // Length for strings
            if (rules.minLength !== undefined && value.length < rules.minLength) {
                errors.push(`${field} must be at least ${rules.minLength} characters`);
            }
            if (rules.maxLength !== undefined && value.length > rules.maxLength) {
                errors.push(`${field} must be at most ${rules.maxLength} characters`);
            }

            // Pattern check
            if (rules.pattern && !rules.pattern.test(value)) {
                errors.push(`${field} format is invalid`);
            }

            // Custom validation
            if (rules.custom) {
                const customError = rules.custom(value, data);
                if (customError) errors.push(customError);
            }
        }

        if (errors.length > 0) {
            throw new ValidationError(`Validation failed: ${errors.join(', ')}`);
        }
    }

    /**
     * Create validation middleware
     * @param {Object} schema - Validation schema
     * @returns {Function} Express middleware
     */
    static createMiddleware(schema) {
        return (req, res, next) => {
            try {
                ValidationHelper.validate(req.body, schema);
                next();
            } catch (error) {
                next(error);
            }
        };
    }
}

// Pre-defined schemas for common resources
ValidationHelper.schemas = {
    control: {
        code: { required: true, type: 'string', maxLength: 100 },
        atomic_level_code: {
            required: true,
            type: 'string',
            enum: ['BASE', 'COMPOSITE', 'SECTION', 'TAB', 'GROUP'],
        },
        atomicLevelCode: {
            required: false,
            type: 'string',
            enum: ['BASE', 'COMPOSITE', 'SECTION', 'TAB', 'GROUP'],
        },
        type: { required: true, type: 'string', maxLength: 50 },
        label: { required: true, type: 'string', maxLength: 200 },
        sort_order: { type: 'number', min: 0 },
        sortOrder: { type: 'number', min: 0 },
    },

    form: {
        code: { required: true, type: 'string', maxLength: 100 },
        version: { required: true, type: 'string', maxLength: 20 },
        label: { required: true, type: 'string', maxLength: 200 },
    },
};

module.exports = ValidationHelper;
