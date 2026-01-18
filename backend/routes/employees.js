const express = require('express');
const { asyncHandler } = require('../utils/errors');
const ResponseFormatter = require('../utils/response');

const router = express.Router();

/**
 * GET /api/employees/:id
 * Get employee by ID (mock data for now)
 * TODO: Integrate with actual employee service/database
 */
router.get('/:id', (req, res) => {
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

/**
 * PUT /api/employees/:id
 * Update employee by ID (mock)
 * TODO: Integrate with actual employee service/database
 */
router.put('/:id', (req, res) => {
    res.json(ResponseFormatter.success({ id: req.params.id }, 'Employee data saved successfully'));
});

module.exports = router;
