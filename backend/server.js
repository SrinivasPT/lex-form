const express = require('express');
const sql = require('mssql');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// SQL Server Configuration
const dbConfig = {
    server: process.env.DB_SERVER,
    port: parseInt(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    options: {
        encrypt: true, // Use encryption
        trustServerCertificate: true, // For local development
    },
};

// Connect to SQL Server
async function connectDB() {
    try {
        await sql.connect(dbConfig);
        console.log('Connected to SQL Server');
    } catch (err) {
        console.error('Database connection failed:', err);
    }
}

// Routes

// GET /form/:formCode - Get form schema as JSON
app.get('/form/:formCode', async (req, res) => {
    try {
        const { formCode } = req.params;
        const query = `
        SELECT
            f.code,
            f.version,
            f.label,
            JSON_QUERY((
                SELECT
                    c.label,
                    c.[key],
                    c.[type],
                    c.width AS width,
                    JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
                FROM dbo.control c
                WHERE c.form_code = f.code
                    AND c.parent_control_code IS NULL
                    AND c.atomic_level_code = 'SECTION'
                ORDER BY c.sort_order
                FOR JSON PATH
            )) AS sections
        FROM dbo.form f
        WHERE f.code = @formCode
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const request = new sql.Request();
        request.input('formCode', sql.VarChar, formCode);
        const result = await request.query(query);
        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            res.json(JSON.parse(result.recordset[0][jsonKey]));
        } else {
            res.status(404).json({ error: 'Schema not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch schema' });
    }
});

// GET /domain/:domainCode - Get domain data as JSON array
app.get('/domain/:domainCode', async (req, res) => {
    try {
        const { domainCode } = req.params;
        const { parentCode } = req.query;
        const query = `
        SELECT
            code,
            display_text AS displayText,
            parent_code AS parentCode,
            extension_json AS extension
        FROM dbo.domain_data
        WHERE category_code = @domainCode
        AND is_active = 1
        AND (@parentCode IS NULL OR parent_code = @parentCode)
        ORDER BY sort_order
        FOR JSON PATH
        `;

        const request = new sql.Request();
        request.input('domainCode', sql.VarChar, domainCode);
        request.input('parentCode', sql.VarChar, parentCode || null);
        const result = await request.query(query);
        let data = [];
        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            const jsonString = result.recordset[0][jsonKey];
            try {
                data = JSON.parse(jsonString);
            } catch (e) {
                console.error('Invalid JSON from query:', e);
                data = [];
            }
        }
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch domain data' });
    }
});

// GET /control/:controlCode - Get control information as JSON
app.get('/control/:controlCode', async (req, res) => {
    try {
        const { controlCode } = req.params;
        const query = `
        SELECT
            c.code,
            c.[key],
            c.type,
            c.label,
            c.placeholder,
            c.help_text AS helpText,
            c.is_required AS required,
            c.is_readonly AS readonly,
            c.width AS width,
            c.min_val AS min,
            c.max_val AS max,
            c.min_length AS minLength,
            c.max_length AS maxLength,
            c.pattern,
            c.category_code AS categoryCode,
            c.dependent_on AS dependentOn,
            c.visible_when AS visibleWhen,
            c.disabled_when AS disabledWhen,
            c.required_when AS requiredWhen,
            c.properties_json AS properties,
            JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
        FROM dbo.control c
        WHERE c.code = @controlCode
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const request = new sql.Request();
        request.input('controlCode', sql.VarChar, controlCode);
        const result = await request.query(query);
        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            res.json(JSON.parse(result.recordset[0][jsonKey]));
        } else {
            res.status(404).json({ error: 'Control not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch control information' });
    }
});

// GET /form/hierarchy/:rootControl - Get control hierarchy as JSON array
app.get('/form/hierarchy/:rootControl', async (req, res) => {
    try {
        const { rootControl } = req.params;
        const query = `
        WITH ControlHierarchy AS (
            -- Start with the root control
            SELECT
                c.code,
                COALESCE(c.label, c.[key], c.code) + ' (' + c.type + ')' AS displayText,
                c.type,
                c.[key],
                c.sort_order,
                CAST(NULL AS VARCHAR(128)) AS parentCode,
                0 AS level,
                CAST(c.code AS VARCHAR(MAX)) AS path
            FROM dbo.control c
            WHERE c.code = @rootControl

            UNION ALL

            -- Child controls with their parents (from control_group)
            SELECT
                c.code,
                COALESCE(c.label, c.[key], c.code) + ' (' + c.type + ')' AS displayText,
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

        const request = new sql.Request();
        request.input('rootControl', sql.VarChar, rootControl);
        const result = await request.query(query);
        let data = [];
        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            const jsonString = result.recordset[0][jsonKey];
            try {
                data = JSON.parse(jsonString);
            } catch (e) {
                console.error('Invalid JSON from query:', e);
                data = [];
            }
        }
        res.json(data);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch control hierarchy' });
    }
});

// GET /api/forms/:formId/metadata - Get form metadata
app.get('/api/forms/:formId/metadata', async (req, res) => {
    try {
        const { formId } = req.params;
        const query = `
        SELECT
            code AS formId,
            label AS formName,
            version,
            GETDATE() AS lastModified
        FROM dbo.form
        WHERE code = @formId
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const request = new sql.Request();
        request.input('formId', sql.VarChar, formId);
        const result = await request.query(query);

        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            res.json(JSON.parse(result.recordset[0][jsonKey]));
        } else {
            res.status(404).json({ error: 'Form metadata not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch form metadata' });
    }
});

// GET /api/forms/:formId/schema - Get form schema (alias for compatibility)
app.get('/api/forms/:formId/schema', async (req, res) => {
    try {
        const { formId } = req.params;
        const query = `
        SELECT
            f.code,
            f.version,
            f.label,
            JSON_QUERY((
                SELECT
                    c.label,
                    c.[key],
                    c.[type],
                    c.width AS width,
                    JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
                FROM dbo.control c
                WHERE c.form_code = f.code
                    AND c.parent_control_code IS NULL
                    AND c.atomic_level_code = 'SECTION'
                ORDER BY c.sort_order
                FOR JSON PATH
            )) AS sections
        FROM dbo.form f
        WHERE f.code = @formId
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        const request = new sql.Request();
        request.input('formId', sql.VarChar, formId);
        const result = await request.query(query);

        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            res.json(JSON.parse(result.recordset[0][jsonKey]));
        } else {
            res.status(404).json({ error: 'Schema not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch schema' });
    }
});

// GET /api/employee/:id - Get employee data by ID
app.get('/api/employee/:id', async (req, res) => {
    try {
        const { id } = req.params;

        // Mock employee data - replace with actual database query
        const mockEmployees = {
            EMP_001: {
                employee: {
                    id: 'EMP_001',
                    firstName: 'John',
                    lastName: 'Doe',
                    nickName: 'Johnny',
                    email: 'john.doe@example.com',
                    dateOfBirth: '1985-06-15',
                    isMarried: true,
                    age: 38,
                    about: 'A brief bio about John Doe.',
                    nationality: 'IN',
                    hasNickName: false,
                    address: {
                        street: '123 Main St',
                        city: 'Hyderabad',
                        countryCode: 'IN',
                        stateCode: 'TG',
                    },
                    employeeDependent: [
                        {
                            id: 'RP_1',
                            firstName: 'Jane',
                            lastName: 'Doe',
                            relation: 'spouse',
                            age: 30,
                        },
                        {
                            id: 'RP_2',
                            firstName: 'Jimmy',
                            lastName: 'Doe',
                            relation: 'child',
                            age: 5,
                        },
                    ],
                },
            },
            EMP_002: {
                employee: {
                    id: 'EMP_002',
                    firstName: 'Jane',
                    lastName: 'Smith',
                    nickName: 'Janie',
                    email: 'jane.smith@example.com',
                    dateOfBirth: '1990-03-22',
                    isMarried: false,
                    age: 34,
                    about: 'Software engineer with 10 years experience.',
                    nationality: 'US',
                    hasNickName: true,
                    address: {
                        street: '456 Oak Ave',
                        city: 'Seattle',
                        countryCode: 'US',
                        stateCode: 'WA',
                    },
                    employeeDependent: [],
                },
            },
        };

        const employeeData = mockEmployees[id];

        if (employeeData) {
            res.json(employeeData);
        } else {
            res.status(404).json({ error: 'Employee not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch employee data' });
    }
});

// PUT /api/employee/:id - Update employee data
app.put('/api/employee/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;

        console.log('Saving employee data:', id, data);

        // Mock save - replace with actual database operation
        // In real app, this would update the database
        res.json({
            success: true,
            message: 'Employee data saved successfully',
            id,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to save employee data' });
    }
});

// GET /api/forms/:formId/domain-data - Get all domain data for a form (mock)
app.get('/api/forms/:formId/domain-data', async (req, res) => {
    try {
        // Return empty object for now - domain data loaded separately
        res.json({});
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch domain data' });
    }
});

// GET /api/forms/:formId/tree-data - Get tree hierarchy for a form (optional)
app.get('/api/forms/:formId/tree-data', async (req, res) => {
    try {
        // Return empty for forms without tree navigation
        res.status(404).json({ error: 'No tree data for this form' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Failed to fetch tree data' });
    }
});

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
