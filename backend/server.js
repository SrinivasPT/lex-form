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

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
