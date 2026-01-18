/**
 * Case Converter Utility
 * Automatic conversion between snake_case (database) and camelCase (JavaScript/UI)
 */

class CaseConverter {
    /**
     * Convert snake_case to camelCase
     * @param {string} str - Snake case string
     * @returns {string} Camel case string
     */
    static toCamelCase(str) {
        if (!str || typeof str !== 'string') return str;
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Convert camelCase to snake_case
     * @param {string} str - Camel case string
     * @returns {string} Snake case string
     */
    static toSnakeCase(str) {
        if (!str || typeof str !== 'string') return str;
        return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    }

    /**
     * Convert all keys in object from snake_case to camelCase
     * @param {Object|Array} obj - Object or array with snake_case keys
     * @returns {Object|Array} Object with camelCase keys
     */
    static keysToCamelCase(obj) {
        if (obj === null || obj === undefined) return obj;

        if (Array.isArray(obj)) {
            return obj.map((item) => this.keysToCamelCase(item));
        }

        if (typeof obj !== 'object' || obj instanceof Date) return obj;

        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const camelKey = this.toCamelCase(key);
            result[camelKey] = this.keysToCamelCase(value);
        }
        return result;
    }

    /**
     * Convert all keys in object from camelCase to snake_case
     * @param {Object|Array} obj - Object or array with camelCase keys
     * @returns {Object|Array} Object with snake_case keys
     */
    static keysToSnakeCase(obj) {
        if (obj === null || obj === undefined) return obj;

        if (Array.isArray(obj)) {
            return obj.map((item) => this.keysToSnakeCase(item));
        }

        if (typeof obj !== 'object' || obj instanceof Date) return obj;

        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const snakeKey = this.toSnakeCase(key);
            result[snakeKey] = this.keysToSnakeCase(value);
        }
        return result;
    }
}

module.exports = CaseConverter;
