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

// GET /schemas/:formCode - Get form schema as JSON
app.get('/schemas/:formCode', async (req, res) => {
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

// Start server
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
