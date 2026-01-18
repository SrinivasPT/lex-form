/**
 * Response Formatter Utility
 * Standardizes API responses across all endpoints
 */

class ResponseFormatter {
    /**
     * Success response
     * @param {*} data - Response data
     * @param {string} message - Optional message
     * @returns {Object} Formatted response
     */
    static success(data, message = null) {
        const response = { success: true, data };
        if (message) response.message = message;
        return response;
    }

    /**
     * Error response
     * @param {string} error - Error message
     * @param {number} statusCode - HTTP status code
     * @param {Object} details - Additional error details
     * @returns {Object} Formatted response
     */
    static error(error, statusCode = 500, details = null) {
        const response = { success: false, error, statusCode };
        if (details) response.details = details;
        return response;
    }

    /**
     * Created response
     * @param {*} data - Created resource data
     * @param {string} location - Resource location
     * @returns {Object} Formatted response
     */
    static created(data, location = null) {
        const response = { success: true, data, statusCode: 201 };
        if (location) response.location = location;
        return response;
    }
}

module.exports = ResponseFormatter;
