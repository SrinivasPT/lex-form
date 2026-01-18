# Backend Design Standards & Architecture

## Overview

This document outlines a **simplified but elegant** backend architecture for the LexForm application. Instead of a complex 4-layer architecture, we propose a pragmatic 3-layer approach that maintains clean separation of concerns while being maintainable and testable.

### Key Design Goals

-   **Write less code**: Create reusable utilities to eliminate repetition
-   **Automatic case conversion**: snake_case (DB) ↔ camelCase (UI) - zero manual mapping!
-   **Maintain flexibility**: Allow customization where needed via configuration
-   **Enforce consistency**: Standard patterns for common operations
-   **Enable testability**: Dependency injection and clear interfaces

### 🎯 Major Feature: Zero Manual Column Mapping

One of the most tedious and error-prone aspects of backend development is manually mapping database column names (snake_case) to JavaScript object keys (camelCase).

**Traditional approach (repetitive)**:

```javascript
// Have to manually map EVERY column in EVERY query
const CONTROL_COLUMNS = {
    code: 'code',
    atomic_level_code: 'atomicLevelCode',
    sort_order: 'sortOrder',
    is_required: 'isRequired',
    // ... repeat for 20+ columns
};
```

**Our approach (automatic)**:

```javascript
// Just list columns or use '*' - conversion is automatic!
columns: '*'; // or ['code', 'atomic_level_code', 'sort_order']
// Returns: { code, atomicLevelCode, sortOrder } ✨
```

This alone saves hundreds of lines of code and eliminates a major source of bugs!

**Flow Diagram**:

```
UI/Frontend (camelCase)
  { atomicLevelCode: 'SECTION', sortOrder: 5 }
           ↓
  [CaseConverter.keysToSnakeCase()]
           ↓
Database (snake_case)
  WHERE atomic_level_code = @atomic_level_code
  AND sort_order = @sort_order
           ↓
  [SQL Query Execution]
           ↓
Database Result (snake_case JSON)
  { "atomic_level_code": "SECTION", "sort_order": 5 }
           ↓
  [CaseConverter.keysToCamelCase()]
           ↓
API Response (camelCase)
  { atomicLevelCode: 'SECTION', sortOrder: 5 }
```

**Developer writes this**:

```javascript
await db.queryJson(query, { atomicLevelCode: 'SECTION' });
// Utilities handle all the conversion automatically!
```

---

## Current State Analysis

### Strengths

-   **Modular routing**: Router separation (`form_admin.js`) from main server
-   **Service layer**: Business logic extracted to `control-service.js`
-   **RESTful design**: Proper HTTP methods and status codes
-   **Database abstraction**: Using `mssql` library with parameterized queries

### Areas for Improvement

1. **Mixed concerns**: Routes contain business logic and database calls
2. **Error handling**: Inconsistent error responses
3. **Validation**: Missing input validation
4. **Configuration**: Hard-coded values mixed with environment variables
5. **Testing**: No test infrastructure
6. **Logging**: Basic console.log statements

---

## Simplified Elegant Architecture

### Core Philosophy

-   **3 layers**: Routes → Services → Database
-   **Single responsibility** per layer
-   **Dependency injection** for testability
-   **Essential complexity only** - avoid over-engineering
-   **Progressive enhancement** - start simple, grow as needed
-   **DRY through utilities** - extract common patterns into reusable functions

### Directory Structure

```
backend/
├── config/
│   ├── database.js          # DB connection & configuration
│   ├── environment.js       # Environment variables
│   └── logger.js            # Simple logging setup
│
├── middleware/
│   ├── error-handler.js     # Global error handling
│   ├── validation.js        # Request validation
│   └── cors-config.js       # CORS configuration
│
├── routes/
│   ├── form-admin.js        # Form admin routes
│   ├── forms.js             # Form data routes
│   ├── controls.js          # Control routes
│   └── domains.js           # Domain data routes
│
├── services/
│   ├── control.service.js   # Control business logic
│   ├── form.service.js      # Form business logic
│   ├── domain.service.js    # Domain data logic
│   └── database.service.js  # Database utilities
│
├── utils/
│   ├── response.js          # Response formatters
│   ├── errors.js            # Custom error classes
│   ├── validation.js        # Validation helpers
│   ├── query-builder.js     # SQL query construction utilities
│   ├── route-factory.js     # Generic route creators (reduces boilerplate)
│   ├── case-converter.js    # snake_case ↔ camelCase conversion
│   ├── pagination.js        # Pagination helpers
│   ├── audit-logger.js      # Audit trail logging
│   └── transaction.js       # Transaction management
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── app.js                   # Express app setup
├── server.js                # Server startup
└── package.json
```

---

## Layer Responsibilities

### 1. Routes Layer

**Responsibility**: HTTP routing, request/response handling

**Simplified with RouteFactory**:

```javascript
// routes/controls.js - 90% reduction in boilerplate
const RouteFactory = require('../utils/route-factory');
const controlService = require('../services/control.service');

const router = RouteFactory.createCrudRoutes(controlService, {
    resourceName: 'Control',
    idParam: 'code',
    validationSchema: ValidationHelper.schemas.control,
});

module.exports = router;
```

### 2. Services Layer

**Responsibility**: Business logic, data transformation, orchestration

**Simplified with Database Utilities**:

```javascript
// services/control.service.js - NO manual column mapping!
const db = require('./database.service');
const QueryBuilder = require('../utils/query-builder');
const { NotFoundError, ValidationError } = require('../utils/errors');

// Just list column names - automatic camelCase conversion!
const CONTROL_COLUMNS = ['code', 'atomic_level_code', 'type', 'label', 'sort_order'];
// Or use '*' for all columns - even simpler!

class ControlService {
    async getAll() {
        return await db.queryJson(
            QueryBuilder.buildJsonQuery({
                table: 'dbo.control',
                columns: '*', // All columns, auto-converted to camelCase!
                orderBy: 'sort_order',
            })
        );
    }

    async getById(code) {
        const result = await db.queryJson(
            QueryBuilder.buildJsonQuery({
                table: 'dbo.control',
                columns: '*',
                where: { code }, // Accept camelCase params
                singleObject: true,
            }),
            { code },
            true
        );

        if (!result) throw new NotFoundError(`Control '${code}' not found`);
        return result; // Already in camelCase for UI!
    }

    async create(data) {
        // Validate
        ValidationHelper.validate(data, ValidationHelper.schemas.control);

        // Business rules
        if (data.atomic_level_code === 'BASE') {
            throw new ValidationError('Cannot create BASE controls');
        }

        // Check existence - accepts camelCase params!
        if (await db.exists('dbo.control', { code: data.code })) {
            throw new ValidationError(`Control '${data.code}' already exists`);
        }

        // Insert - frontend sends camelCase, DB receives snake_case automatically
        // Input: { code, atomicLevelCode, sortOrder }
        // SQL gets: @code, @atomic_level_code, @sort_order
        await db.executeQuery(
            `INSERT INTO dbo.control (code, atomic_level_code, type, label, sort_order)
             VALUES (@code, @atomic_level_code, @type, @label, @sort_order)`,
            data // Can use camelCase here!
        );

        return await this.getById(data.code); // Returns camelCase
    }

    async update(code, data) {
        await this.getById(code); // Ensure exists

        const setClause = Object.keys(data)
            .map((k) => `${k} = @${k}`)
            .join(', ');

        await db.executeQuery(`UPDATE dbo.control SET ${setClause} WHERE code = @code`, {
            ...data,
            code,
        });

        return await this.getById(code);
    }

    async delete(code) {
        await this.getById(code);
        await db.executeQuery('DELETE FROM dbo.control WHERE code = @code', { code });
    }
}

module.exports = new ControlService();
```

### 3. Database Layer

**Responsibility**: Database connection, query execution, result parsing

See complete DatabaseService implementation in the utilities section above.

---

## Essential Utilities (Write Less Code)

### 1. Case Converter Utility (Database ↔ UI)

Automatically converts between snake_case (database) and camelCase (UI):

```javascript
// utils/case-converter.js

class CaseConverter {
    /**
     * Convert snake_case to camelCase
     * @param {string} str - Snake case string
     * @returns {string} Camel case string
     */
    static toCamelCase(str) {
        return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    }

    /**
     * Convert camelCase to snake_case
     * @param {string} str - Camel case string
     * @returns {string} Snake case string
     */
    static toSnakeCase(str) {
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

        if (typeof obj !== 'object') return obj;

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

        if (typeof obj !== 'object') return obj;

        const result = {};
        for (const [key, value] of Object.entries(obj)) {
            const snakeKey = this.toSnakeCase(key);
            result[snakeKey] = this.keysToSnakeCase(value);
        }
        return result;
    }
}

module.exports = CaseConverter;
```

### 2. Database Service with Automatic Case Conversion

The database service eliminates repetitive query execution and JSON parsing:

```javascript
// services/database.service.js
const sql = require('mssql');
const config = require('../config/database');
const logger = require('../config/logger');
const CaseConverter = require('../utils/case-converter');

class DatabaseService {
    constructor() {
        this.pool = null;
    }

    async connect() {
        if (!this.pool) {
            this.pool = await sql.connect(config);
            logger.info('Database connected');
        }
        return this.pool;
    }

    /**
     * Execute parameterized query
     * Automatically converts camelCase params to snake_case for DB
     * @param {string} query - SQL query
     * @param {Object} params - Query parameters (camelCase or snake_case)
     * @returns {Promise<Object>} Query result
     */
    async executeQuery(query, params = {}) {
        const pool = await this.connect();
        const request = pool.request();

        // Convert camelCase params to snake_case for database
        const dbParams = CaseConverter.keysToSnakeCase(params);

        // Add parameters with type inference
        Object.entries(dbParams).forEach(([key, value]) => {
            request.input(key, this._inferSqlType(value), value);
        });

        try {
            return await request.query(query);
        } catch (error) {
            logger.error('Database query failed', { query, error: error.message });
            throw error;
        }
    }

    /**
     * Parse JSON result from SQL Server with automatic camelCase conversion
     * @param {Object} result - Query result
     * @param {boolean} singleObject - Return single object vs array
     * @param {boolean} convertCase - Convert snake_case to camelCase (default: true)
     * @returns {*} Parsed JSON data with camelCase keys
     */
    parseJsonResult(result, singleObject = false, convertCase = true) {
        if (!result.recordset || result.recordset.length === 0) {
            return singleObject ? null : [];
        }

        const jsonKey = Object.keys(result.recordset[0])[0];
        const jsonString = result.recordset[0][jsonKey];

        try {
            const parsed = JSON.parse(jsonString);
            // Automatically convert snake_case to camelCase for UI
            return convertCase ? CaseConverter.keysToCamelCase(parsed) : parsed;
        } catch (error) {
            logger.error('Failed to parse JSON result', { error: error.message });
            return singleObject ? null : [];
        }
    }

    /**
     * Execute query and parse JSON result with automatic camelCase conversion
     * @param {string} query - SQL query
     * @param {Object} params - Query parameters (accepts camelCase)
     * @param {boolean} singleObject - Return single object vs array
     * @returns {Promise<*>} Parsed result with camelCase keys
     */
    async queryJson(query, params = {}, singleObject = false) {
        const result = await this.executeQuery(query, params);
        return this.parseJsonResult(result, singleObject, true);
    }

    /**
     * Check if record exists (eliminates boilerplate existence checks)
     * @param {string} table - Table name
     * @param {Object} where - Where clause conditions
     * @returns {Promise<boolean>}
     */
    async exists(table, where) {
        const conditions = Object.keys(where)
            .map((key) => `${key} = @${key}`)
            .join(' AND ');
        const query = `SELECT 1 FROM ${table} WHERE ${conditions}`;
        const result = await this.executeQuery(query, where);
        return result.recordset.length > 0;
    }

    /**
     * Infer SQL type from JavaScript value
     * @private
     */
    _inferSqlType(value) {
        if (typeof value === 'string') return sql.VarChar;
        if (typeof value === 'number') return Number.isInteger(value) ? sql.Int : sql.Float;
        if (typeof value === 'boolean') return sql.Bit;
        if (value instanceof Date) return sql.DateTime;
        return sql.VarChar;
    }

    async close() {
        if (this.pool) {
            await this.pool.close();
            this.pool = null;
            logger.info('Database connection closed');
        }
    }
}

module.exports = new DatabaseService();
```

### 3. Query Builder Utility

Eliminates repetitive SELECT query construction - now with NO manual column mapping needed:

```javascript
// utils/query-builder.js
const CaseConverter = require('./case-converter');

class QueryBuilder {
    /**
     * Build a SELECT query with automatic JSON PATH formatting
     * No manual column mapping needed - automatic camelCase conversion!
     * @param {Object} options
     * @param {string} options.table - Table name
     * @param {Array<string>|string} options.columns - Column names or '*' (snake_case)
     * @param {Object} options.where - Where conditions (accepts camelCase)
     * @param {string} options.orderBy - Order by clause
     * @param {boolean} options.singleObject - Use WITHOUT_ARRAY_WRAPPER
     * @returns {string} SQL query
     */
    static buildJsonQuery({ table, columns = '*', where, orderBy, singleObject = false }) {
        let columnList;

        if (columns === '*') {
            // Select all columns - camelCase conversion happens in parseJsonResult
            columnList = '*';
        } else if (Array.isArray(columns)) {
            // Array of column names - no manual mapping needed!
            columnList = columns.join(',\n                ');
        } else {
            // Backward compatibility: object mapping { dbColumn: 'alias' }
            columnList = Object.entries(columns)
                .map(([dbCol, alias]) => `${dbCol} AS ${alias}`)
                .join(',\n                ');
        }

        let query = `SELECT\n                ${columnList}\n            FROM ${table}`;

        if (where && Object.keys(where).length > 0) {
            // Convert camelCase keys to snake_case for WHERE clause
            const dbWhere = CaseConverter.keysToSnakeCase(where);
            const conditions = Object.keys(dbWhere)
                .map((key) => `${key} = @${key}`)
                .join(' AND ');
            query += `\n            WHERE ${conditions}`;
        }

        if (orderBy) {
            query += `\n            ORDER BY ${orderBy}`;
        }

        query += '\n            FOR JSON PATH';
        if (singleObject) {
            query += ', WITHOUT_ARRAY_WRAPPER';
        }

        return query;
    }

    /**
     * Build a hierarchical query with child controls
     * @param {string} parentColumn - Parent reference column
     * @param {string} childTable - Child table name
     * @param {Object} columns - Column mapping
     * @returns {string} JSON_QUERY subquery
     */
    static buildHierarchicalQuery(parentColumn, childTable, columns) {
        const columnList = Object.entries(columns)
            .map(([dbCol, jsonKey]) => `${dbCol} AS ${jsonKey}`)
            .join(',\n                    ');

        return `JSON_QUERY((
                SELECT
                    ${columnList},
                    dbo.fn_GetControlChildren(${childTable}.code) AS controls
                FROM ${childTable}
                WHERE ${childTable}.${parentColumn} = parent.code
                ORDER BY ${childTable}.sort_order
                FOR JSON PATH
            ))`;
    }
}

module.exports = QueryBuilder;
```

**For Complex Queries - Use Custom SQL or Database Objects**:

The QueryBuilder is designed for **standard CRUD operations**. For complex queries like hierarchies, recursive CTEs, or advanced joins, you have multiple options:

#### Option 1: Database Functions (Recommended for Reusable Logic)

```sql
-- db/functions/fn_GetControlHierarchy.sql
CREATE OR ALTER FUNCTION dbo.fn_GetControlHierarchy(@rootCode NVARCHAR(128))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @result NVARCHAR(MAX);

    WITH ControlHierarchy AS (
        -- Anchor: Root control
        SELECT
            c.code,
            c.label,
            c.type,
            c.sort_order,
            CAST(NULL AS NVARCHAR(128)) AS parent_code,
            0 AS level,
            CAST(c.code AS NVARCHAR(MAX)) AS path
        FROM dbo.control c
        WHERE c.code = @rootCode

        UNION ALL

        -- Recursive: Child controls
        SELECT
            c.code,
            c.label,
            c.type,
            c.sort_order,
            cg.control_code AS parent_code,
            ch.level + 1,
            ch.path + '/' + c.code
        FROM dbo.control c
        INNER JOIN dbo.control_group cg ON c.code = cg.child_control_code
        INNER JOIN ControlHierarchy ch ON cg.control_code = ch.code
    )
    SELECT @result = (
        SELECT * FROM ControlHierarchy
        ORDER BY path, sort_order
        FOR JSON PATH
    );

    RETURN @result;
END;
```

**Usage in Service**:

```javascript
// services/control.service.js
async getHierarchy(rootCode) {
    const query = `SELECT dbo.fn_GetControlHierarchy(@root_code) AS result`;
    const result = await db.queryJson(query, { rootCode }, true);
    return result?.result ? JSON.parse(result.result) : [];
}
```

#### Option 2: Database Views (Recommended for Frequent Complex Queries)

```sql
-- db/views/vw_control_hierarchy.sql
CREATE OR ALTER VIEW dbo.vw_control_hierarchy
AS
WITH ControlHierarchy AS (
    -- All root controls (no parent)
    SELECT
        c.code,
        c.label,
        c.type,
        c.atomic_level_code,
        c.sort_order,
        c.form_code,
        CAST(NULL AS NVARCHAR(128)) AS parent_code,
        0 AS level,
        CAST(c.code AS NVARCHAR(MAX)) AS path
    FROM dbo.control c
    WHERE NOT EXISTS (
        SELECT 1 FROM dbo.control_group cg
        WHERE cg.child_control_code = c.code
    )

    UNION ALL

    -- All child controls
    SELECT
        c.code,
        c.label,
        c.type,
        c.atomic_level_code,
        c.sort_order,
        c.form_code,
        cg.control_code AS parent_code,
        ch.level + 1,
        ch.path + '/' + c.code
    FROM dbo.control c
    INNER JOIN dbo.control_group cg ON c.code = cg.child_control_code
    INNER JOIN ControlHierarchy ch ON cg.control_code = ch.code
)
SELECT
    code,
    label,
    type,
    atomic_level_code,
    sort_order,
    form_code,
    parent_code,
    level,
    path
FROM ControlHierarchy;
```

**Usage in Service**:

```javascript
// services/control.service.js
async getHierarchyForForm(formCode) {
    // Simple query against view - view handles complexity
    const query = QueryBuilder.buildJsonQuery({
        table: 'dbo.vw_control_hierarchy',
        columns: '*',
        where: { formCode },
        orderBy: 'path, sort_order',
    });

    return await db.queryJson(query, { formCode });
}
```

#### Option 3: Stored Procedures (Recommended for Complex Business Logic)

```sql
-- db/procedures/sp_GetFormWithHierarchy.sql
CREATE OR ALTER PROCEDURE dbo.sp_GetFormWithHierarchy
    @form_code NVARCHAR(128)
AS
BEGIN
    SET NOCOUNT ON;

    -- Complex multi-step logic
    DECLARE @formExists BIT = 0;

    -- Check if form exists
    SELECT @formExists = 1 FROM dbo.form WHERE code = @form_code;

    IF @formExists = 0
    BEGIN
        -- Return error as JSON
        SELECT 'Form not found' AS error FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
        RETURN;
    END

    -- Get form with nested hierarchy
    SELECT
        f.code,
        f.version,
        f.label,
        JSON_QUERY((
            SELECT
                c.code,
                c.type,
                c.label,
                c.sort_order,
                JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
            FROM dbo.control c
            WHERE c.form_code = f.code
                AND c.parent_control_code IS NULL
            ORDER BY c.sort_order
            FOR JSON PATH
        )) AS sections
    FROM dbo.form f
    WHERE f.code = @form_code
    FOR JSON PATH, WITHOUT_ARRAY_WRAPPER;
END;
```

**Usage in Service**:

```javascript
// services/form.service.js
async getFormWithHierarchy(formCode) {
    const query = `EXEC dbo.sp_GetFormWithHierarchy @form_code`;
    return await db.queryJson(query, { formCode }, true);
}
```

#### Option 4: Custom SQL in Service (For One-Off Complex Queries)

When the query is unique and doesn't need to be reused:

```javascript
// services/control.service.js
async getControlHierarchy(rootCode) {
    // Complex query directly in service - fine for one-off cases
    const query = `
        WITH ControlHierarchy AS (
            SELECT
                c.code,
                c.label,
                c.type,
                CAST(NULL AS NVARCHAR(128)) AS parent_code,
                0 AS level,
                CAST(c.code AS NVARCHAR(MAX)) AS path
            FROM dbo.control c
            WHERE c.code = @root_code

            UNION ALL

            SELECT
                c.code,
                c.label,
                c.type,
                cg.control_code AS parent_code,
                ch.level + 1,
                ch.path + '/' + c.code
            FROM dbo.control c
            INNER JOIN dbo.control_group cg ON c.code = cg.child_control_code
            INNER JOIN ControlHierarchy ch ON cg.control_code = ch.code
        )
        SELECT * FROM ControlHierarchy
        ORDER BY path, sort_order
        FOR JSON PATH
    `;

    return await db.queryJson(query, { rootCode });
}
```

### Decision Matrix: When to Use What?

| Scenario                      | Recommended Approach      | Why                                       |
| ----------------------------- | ------------------------- | ----------------------------------------- |
| Simple CRUD                   | **QueryBuilder**          | Standard patterns, auto case conversion   |
| Reusable complex logic        | **Database Function**     | Encapsulation, performance, reusability   |
| Frequent complex reads        | **View**                  | Query optimization, simplicity in code    |
| Complex business logic        | **Stored Procedure**      | Multiple steps, transactions, performance |
| One-off complex query         | **Custom SQL in Service** | Flexibility, no DB object overhead        |
| Hierarchical data             | **Function or View**      | SQL Server optimized for recursive CTEs   |
| Cross-table aggregations      | **View**                  | Simplify queries, consistent results      |
| Data modifications with logic | **Stored Procedure**      | Business rules in DB, atomicity           |

### Example: Real-World Hierarchy Implementation

```javascript
// services/control.service.js
class ControlService {
    // Standard CRUD - use utilities
    async getAll() {
        return await db.queryJson(
            QueryBuilder.buildJsonQuery({
                table: 'dbo.control',
                columns: '*',
            })
        );
    }

    // Complex hierarchy - use database function
    async getHierarchy(rootCode) {
        const query = `SELECT dbo.fn_GetControlHierarchy(@root_code) AS hierarchy`;
        const result = await db.queryJson(query, { rootCode }, true);
        return result?.hierarchy ? JSON.parse(result.hierarchy) : [];
    }

    // Frequently used hierarchy - use view
    async getFormHierarchy(formCode) {
        const query = QueryBuilder.buildJsonQuery({
            table: 'dbo.vw_control_hierarchy',
            columns: '*',
            where: { formCode },
            orderBy: 'level, sort_order',
        });
        return await db.queryJson(query, { formCode });
    }

    // Complex form generation - use stored procedure
    async generateFormDefinition(formCode) {
        const query = `EXEC dbo.sp_GetFormWithHierarchy @form_code`;
        return await db.queryJson(query, { formCode }, true);
    }

    // One-off complex query - inline SQL
    async getControlDependencyGraph(controlCode) {
        const query = `
            -- Complex dependency analysis with multiple CTEs
            WITH DirectDependencies AS (
                SELECT dependent_on FROM dbo.control WHERE code = @control_code
            ),
            TransitiveDependencies AS (
                -- Recursive CTE to get all transitive dependencies
                ...
            )
            SELECT * FROM TransitiveDependencies
            FOR JSON PATH
        `;
        return await db.queryJson(query, { controlCode });
    }
}
```

### Best Practices for Complex Queries

1. **Encapsulate in Database for**:

    - Recursive CTEs (hierarchies)
    - Complex aggregations
    - Frequently used logic
    - Performance-critical operations

2. **Keep in Service Layer for**:

    - One-off queries
    - Simple parameterized queries
    - Queries that need frequent changes
    - Development/prototyping

3. **Use Functions When**:

    - Logic is pure computation
    - Reused in multiple queries
    - Need inline results in SELECT

4. **Use Views When**:

    - Complex joins needed frequently
    - Simplify access to denormalized data
    - Provide consistent data view
    - Abstract complexity from application

5. **Use Stored Procedures When**:
    - Multiple operations in transaction
    - Complex business rules
    - Need OUTPUT parameters
    - Performance critical batch operations

### Best Practices for Complex Queries

1. **Encapsulate in Database for**:

    - Recursive CTEs (hierarchies)
    - Complex aggregations
    - Frequently used logic
    - Performance-critical operations

2. **Keep in Service Layer for**:

    - One-off queries
    - Simple parameterized queries
    - Queries that need frequent changes
    - Development/prototyping

3. **Use Functions When**:

    - Logic is pure computation
    - Reused in multiple queries
    - Need inline results in SELECT

4. **Use Views When**:

    - Complex joins needed frequently
    - Simplify access to denormalized data
    - Provide consistent data view
    - Abstract complexity from application

5. **Use Stored Procedures When**:
    - Multiple operations in transaction
    - Complex business rules
    - Need OUTPUT parameters
    - Performance critical batch operations

### Database Objects Organization

Organize your database scripts for complex queries:

```
db/
├── schema/
│   └── 1.0.schema.sql           # Base tables
│
├── functions/
│   ├── fn_GetControlHierarchy.sql
│   ├── fn_GetControlChildren.sql
│   └── fn_FormatControlPath.sql
│
├── views/
│   ├── vw_control_hierarchy.sql
│   ├── vw_form_controls.sql
│   └── vw_active_controls.sql
│
├── procedures/
│   ├── sp_GetFormWithHierarchy.sql
│   ├── sp_BulkCreateControls.sql
│   └── sp_CloneForm.sql
│
└── indexes/
    ├── ix_control_performance.sql
    └── ix_hierarchy_lookups.sql
```

### Database Service Extensions for Complex Queries

Add helpers for database objects:

```javascript
// services/database.service.js - Add these methods

/**
 * Execute stored procedure with output parameters
 * @param {string} procedureName - Procedure name
 * @param {Object} inputs - Input parameters (camelCase)
 * @param {Object} outputs - Output parameter definitions
 * @returns {Promise<Object>} Result with outputs
 */
async executeStoredProcedure(procedureName, inputs = {}, outputs = {}) {
    const pool = await this.connect();
    const request = pool.request();

    // Add input parameters
    const dbInputs = CaseConverter.keysToSnakeCase(inputs);
    Object.entries(dbInputs).forEach(([key, value]) => {
        request.input(key, this._inferSqlType(value), value);
    });

    // Add output parameters
    Object.entries(outputs).forEach(([key, type]) => {
        request.output(key, type);
    });

    try {
        const result = await request.execute(procedureName);

        // Convert output parameters to camelCase
        const outputValues = {};
        Object.keys(outputs).forEach(key => {
            const camelKey = CaseConverter.toCamelCase(key);
            outputValues[camelKey] = result.output[key];
        });

        return {
            recordset: result.recordset,
            output: outputValues,
            rowsAffected: result.rowsAffected,
        };
    } catch (error) {
        logger.error('Stored procedure execution failed', {
            procedureName,
            error: error.message
        });
        throw error;
    }
}

/**
 * Check if database object exists
 * @param {string} objectName - Object name
 * @param {string} objectType - 'FN' | 'V' | 'P' | 'U' (function, view, proc, table)
 * @returns {Promise<boolean>}
 */
async objectExists(objectName, objectType) {
    const query = `
        SELECT 1
        FROM sys.objects
        WHERE object_id = OBJECT_ID(@object_name)
        AND type = @object_type
    `;

    const result = await this.executeQuery(query, {
        objectName,
        objectType,
    });

    return result.recordset.length > 0;
}

/**
 * Get view or function definition
 * @param {string} objectName - Object name
 * @returns {Promise<string>} Object definition
 */
async getObjectDefinition(objectName) {
    const query = `
        SELECT definition
        FROM sys.sql_modules
        WHERE object_id = OBJECT_ID(@object_name)
    `;

    const result = await this.executeQuery(query, { objectName });
    return result.recordset[0]?.definition || null;
}
```

**Usage Examples**:

```javascript
// Call stored procedure with outputs
const result = await db.executeStoredProcedure(
    'dbo.sp_ProcessForm',
    { formCode: 'EMPLOYEE_FORM', userId: 'john' },
    { recordCount: sql.Int, errorMessage: sql.VarChar(500) }
);

console.log(result.output.recordCount);
console.log(result.output.errorMessage);

// Check if function exists before calling
if (await db.objectExists('dbo.fn_GetControlHierarchy', 'FN')) {
    const hierarchy = await db.queryJson(...);
}
```

### Performance Considerations

When deciding between database objects vs application code:

**Choose Database Objects (Functions/Views/Procedures) for**:
✅ Complex hierarchical queries (SQL Server optimizes recursive CTEs)  
✅ Set-based operations on large datasets  
✅ Queries requiring multiple table scans  
✅ Aggregations across millions of rows  
✅ Compiled execution plans (stored procedures)

**Choose Application Code for**:
✅ Simple CRUD operations  
✅ Logic requiring external API calls  
✅ Business rules that change frequently  
✅ Operations needing application context  
✅ Development flexibility

### Real-World Example: Form Hierarchy Service

```javascript
// services/form.service.js
const db = require('./database.service');
const QueryBuilder = require('../utils/query-builder');

class FormService {
    /**
     * Get basic form info - simple query, use QueryBuilder
     */
    async getById(formCode) {
        const query = QueryBuilder.buildJsonQuery({
            table: 'dbo.form',
            columns: '*',
            where: { code: formCode },
            singleObject: true,
        });
        return await db.queryJson(query, { formCode }, true);
    }

    /**
     * Get form with complete hierarchy - complex, use database function
     * This leverages fn_GetControlChildren for recursive hierarchy
     */
    async getFormWithControls(formCode) {
        // Complex query with recursive function call
        const query = `
            SELECT
                f.code,
                f.version,
                f.label,
                JSON_QUERY((
                    SELECT
                        c.code,
                        c.type,
                        c.label,
                        c.sort_order,
                        c.properties_json,
                        -- Recursive function for nested controls
                        JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
                    FROM dbo.control c
                    WHERE c.form_code = f.code
                        AND c.parent_control_code IS NULL
                        AND c.atomic_level_code = 'SECTION'
                    ORDER BY c.sort_order
                    FOR JSON PATH
                )) AS sections
            FROM dbo.form f
            WHERE f.code = @form_code
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        return await db.queryJson(query, { formCode }, true);
    }

    /**
     * Get flattened hierarchy - use view
     */
    async getControlsFlat(formCode) {
        const query = QueryBuilder.buildJsonQuery({
            table: 'dbo.vw_control_hierarchy',
            columns: '*',
            where: { formCode },
            orderBy: 'level, sort_order',
        });
        return await db.queryJson(query, { formCode });
    }

    /**
     * Clone form with all controls - complex transaction, use stored procedure
     */
    async cloneForm(sourceFormCode, targetFormCode, userId) {
        return await db.executeStoredProcedure(
            'dbo.sp_CloneForm',
            {
                sourceFormCode,
                targetFormCode,
                userId,
            },
            {
                controlsCloned: sql.Int,
                success: sql.Bit,
            }
        );
    }

    /**
     * Get form statistics - one-off complex query, inline SQL
     */
    async getFormStatistics(formCode) {
        const query = `
            SELECT
                f.code,
                f.label,
                (SELECT COUNT(*) FROM dbo.control WHERE form_code = f.code) AS total_controls,
                (SELECT COUNT(DISTINCT type) FROM dbo.control WHERE form_code = f.code) AS control_types,
                (SELECT MAX(level) FROM dbo.vw_control_hierarchy WHERE form_code = f.code) AS max_depth,
                (SELECT COUNT(*) FROM dbo.control WHERE form_code = f.code AND is_required = 1) AS required_fields
            FROM dbo.form f
            WHERE f.code = @form_code
            FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
        `;

        return await db.queryJson(query, { formCode }, true);
    }
}

module.exports = new FormService();
```

### Migration Strategy

Keep existing complex queries (like `fn_GetControlChildren`) as-is! They work well and are optimized. Just wrap them with the new utilities:

```javascript
// BEFORE (existing server.js code)
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
                    c.code,
                    c.atomic_level_code AS atomicLevelCode,
                    c.type,
                    c.[key],
                    c.label,
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

// AFTER (with utilities - much cleaner, same query!)
// routes/forms.js
router.get('/:formCode', asyncHandler(async (req, res) => {
    const form = await formService.getFormWithControls(req.params.formCode);
    res.json(ResponseFormatter.success(form));
}));

// services/form.service.js
async getFormWithControls(formCode) {
    // Keep the same complex query - just use utilities for execution
    const query = `
        SELECT
            f.code,
            f.version,
            f.label,
            JSON_QUERY((
                SELECT
                    c.code,
                    c.atomic_level_code AS atomicLevelCode,
                    c.type,
                    c.[key],
                    c.label,
                    c.placeholder,
                    c.help_text AS helpText,
                    c.sort_order AS sortOrder,
                    c.width,
                    c.visible_when AS visibleWhen,
                    c.disabled_when AS disabledWhen,
                    c.is_required AS required,
                    c.is_readonly AS readonly,
                    c.properties_json AS properties,
                    c.guid,
                    JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
                FROM dbo.control c
                WHERE c.form_code = f.code
                    AND c.parent_control_code IS NULL
                    AND c.atomic_level_code = 'SECTION'
                ORDER BY c.sort_order
                FOR JSON PATH
            )) AS sections
        FROM dbo.form f
        WHERE f.code = @form_code
        FOR JSON PATH, WITHOUT_ARRAY_WRAPPER
    `;

    // Much cleaner! Automatic parameter handling and JSON parsing
    const result = await db.queryJson(query, { formCode }, true);

    if (!result) {
        throw new NotFoundError(`Form '${formCode}' not found`);
    }

    return result;
}
```

**Benefits of wrapping existing queries**:

-   ✅ Keep proven, optimized queries
-   ✅ Cleaner parameter handling (camelCase works automatically)
-   ✅ Automatic JSON parsing
-   ✅ Consistent error handling
-   ✅ Less boilerplate code
-   ✅ No need to rewrite complex logic

### Summary: Flexibility for Complex Queries

The architecture provides **three levels of flexibility**:

1. **Simple Operations** → Use QueryBuilder & utilities (80% of cases)

    ```javascript
    await db.queryJson(QueryBuilder.buildJsonQuery({...}));
    ```

2. **Complex Reusable Logic** → Use database functions/views (15% of cases)

    ```javascript
    const query = `SELECT dbo.fn_GetControlHierarchy(@root_code)`;
    await db.queryJson(query, { rootCode });
    ```

3. **Complex One-Off Queries** → Custom SQL with utilities (5% of cases)
    ```javascript
    const query = `WITH RecursiveCTE AS (...) SELECT ...`;
    await db.queryJson(query, params);
    ```

**Key Principle**: Use the right tool for the job. Don't force complex queries into generic patterns. The utilities handle the boilerplate (parameters, JSON parsing, case conversion) while you maintain full control over query complexity.

### 4. Route Factory (Reduce Boilerplate)

Create standard CRUD routes with minimal code:

```javascript
// utils/route-factory.js
const express = require('express');
const { asyncHandler } = require('./errors');
const { validateRequest } = require('../middleware/validation');

class RouteFactory {
    /**
     * Create standard CRUD routes for a resource
     * @param {Object} service - Service with CRUD methods
     * @param {Object} options - Configuration options
     * @returns {express.Router} Router with CRUD routes
     */
    static createCrudRoutes(service, options = {}) {
        const router = express.Router();
        const {
            resourceName = 'resource',
            idParam = 'code',
            validationSchema = null,
            customRoutes = null,
        } = options;

        // GET /resources - List all
        if (service.getAll) {
            router.get(
                '/',
                asyncHandler(async (req, res) => {
                    const data = await service.getAll(req.query);
                    res.json({ success: true, data });
                })
            );
        }

        // GET /resources/:id - Get one
        if (service.getById) {
            router.get(
                `/:${idParam}`,
                asyncHandler(async (req, res) => {
                    const data = await service.getById(req.params[idParam]);
                    if (!data) {
                        return res.status(404).json({
                            success: false,
                            error: `${resourceName} not found`,
                        });
                    }
                    res.json({ success: true, data });
                })
            );
        }

        // POST /resources - Create
        if (service.create) {
            const middleware = validationSchema
                ? [
                      validateRequest(validationSchema),
                      asyncHandler(async (req, res) => {
                          const data = await service.create(req.body);
                          res.status(201).json({ success: true, data });
                      }),
                  ]
                : [
                      asyncHandler(async (req, res) => {
                          const data = await service.create(req.body);
                          res.status(201).json({ success: true, data });
                      }),
                  ];

            router.post('/', ...middleware);
        }

        // PUT /resources/:id - Update
        if (service.update) {
            const middleware = validationSchema
                ? [
                      validateRequest(validationSchema),
                      asyncHandler(async (req, res) => {
                          const data = await service.update(req.params[idParam], req.body);
                          res.json({ success: true, data });
                      }),
                  ]
                : [
                      asyncHandler(async (req, res) => {
                          const data = await service.update(req.params[idParam], req.body);
                          res.json({ success: true, data });
                      }),
                  ];

            router.put(`/:${idParam}`, ...middleware);
        }

        // DELETE /resources/:id - Delete
        if (service.delete) {
            router.delete(
                `/:${idParam}`,
                asyncHandler(async (req, res) => {
                    await service.delete(req.params[idParam]);
                    res.json({ success: true, message: `${resourceName} deleted` });
                })
            );
        }

        // Add custom routes if provided
        if (customRoutes) {
            customRoutes(router, service);
        }

        return router;
    }

    /**
     * Create a simple route with standard error handling
     * @param {string} method - HTTP method
     * @param {string} path - Route path
     * @param {Function} handler - Route handler
     * @param {Object} options - Options (middleware, validation)
     * @returns {Object} Route definition
     */
    static createRoute(method, path, handler, options = {}) {
        const { middleware = [], validation = null } = options;

        const allMiddleware = [...middleware];
        if (validation) {
            allMiddleware.push(validateRequest(validation));
        }
        allMiddleware.push(asyncHandler(handler));

        return { method, path, middleware: allMiddleware };
    }
}

module.exports = RouteFactory;
```

### 4. Enhanced Validation Utility

Schema-based validation that reduces repetitive validation code:

```javascript
// utils/validation.js
const { ValidationError } = require('./errors');

class ValidationHelper {
    /**
     * Define a validation schema
     * @param {Object} schema - Field validation rules
     * @returns {Object} Validation schema
     */
    static defineSchema(schema) {
        return schema;
    }

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
        type: { required: true, type: 'string', maxLength: 50 },
        label: { required: true, type: 'string', maxLength: 200 },
        sort_order: { type: 'number', min: 0 },
    },

    form: {
        code: { required: true, type: 'string', maxLength: 100 },
        version: { required: true, type: 'string', maxLength: 20 },
        label: { required: true, type: 'string', maxLength: 200 },
    },
};

module.exports = ValidationHelper;
```

### 5. Response Formatter Utility

Standardize API responses:

```javascript
// utils/response.js

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
     * Paginated response
     * @param {Array} data - Data array
     * @param {Object} pagination - Pagination info
     * @returns {Object} Formatted response
     */
    static paginated(data, pagination) {
        return {
            success: true,
            data,
            pagination: {
                page: pagination.page,
                pageSize: pagination.pageSize,
                total: pagination.total,
                totalPages: Math.ceil(pagination.total / pagination.pageSize),
            },
        };
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
```

### 6. Transaction Utility (Critical for Data Integrity)

Simplifies multi-step operations that need atomicity:

```javascript
// utils/transaction.js
const sql = require('mssql');
const logger = require('../config/logger');

class TransactionManager {
    /**
     * Execute multiple operations in a transaction
     * @param {Function} callback - Async function receiving transaction object
     * @returns {Promise<*>} Result of callback
     */
    static async execute(callback) {
        const pool = await sql.connect();
        const transaction = pool.transaction();

        try {
            await transaction.begin();
            const result = await callback(transaction);
            await transaction.commit();
            return result;
        } catch (error) {
            await transaction.rollback();
            logger.error('Transaction rolled back', { error: error.message });
            throw error;
        }
    }

    /**
     * Execute query within transaction with case conversion
     * @param {Object} transaction - SQL transaction object
     * @param {string} query - SQL query
     * @param {Object} params - Query parameters (camelCase)
     * @returns {Promise<Object>} Query result
     */
    static async query(transaction, query, params = {}) {
        const CaseConverter = require('./case-converter');
        const request = transaction.request();

        // Convert camelCase to snake_case
        const dbParams = CaseConverter.keysToSnakeCase(params);

        Object.entries(dbParams).forEach(([key, value]) => {
            request.input(key, value);
        });

        return await request.query(query);
    }
}

module.exports = TransactionManager;
```

**Usage**:

```javascript
// Create control and associate with group atomically
async createControlWithGroup(controlData, groupCode) {
    return await TransactionManager.execute(async (tx) => {
        // Insert control
        await TransactionManager.query(tx,
            `INSERT INTO dbo.control (...) VALUES (...)`,
            controlData
        );

        // Associate with group
        await TransactionManager.query(tx,
            `INSERT INTO dbo.control_group (...) VALUES (...)`,
            { controlCode: controlData.code, groupCode }
        );

        return await this.getById(controlData.code);
    });
}
```

### 7. Pagination Utility (Essential for Large Datasets)

Standardizes pagination across all endpoints:

```javascript
// utils/pagination.js
const CaseConverter = require('./case-converter');

class PaginationHelper {
    /**
     * Parse pagination parameters from request
     * @param {Object} query - Request query parameters
     * @param {Object} options - Default values
     * @returns {Object} Pagination parameters
     */
    static parsePaginationParams(query, options = {}) {
        const { defaultPage = 1, defaultPageSize = 20, maxPageSize = 100 } = options;

        let page = parseInt(query.page) || defaultPage;
        let pageSize = parseInt(query.pageSize || query.limit) || defaultPageSize;

        // Validate
        page = Math.max(1, page);
        pageSize = Math.min(Math.max(1, pageSize), maxPageSize);

        const offset = (page - 1) * pageSize;

        return { page, pageSize, offset };
    }

    /**
     * Build SQL pagination clause
     * @param {number} offset - Offset value
     * @param {number} pageSize - Page size
     * @returns {string} SQL OFFSET/FETCH clause
     */
    static buildPaginationClause(offset, pageSize) {
        return `OFFSET ${offset} ROWS FETCH NEXT ${pageSize} ROWS ONLY`;
    }

    /**
     * Build paginated query with total count
     * @param {Object} options
     * @returns {Object} { dataQuery, countQuery }
     */
    static buildPaginatedQueries({ table, columns, where, orderBy, offset, pageSize }) {
        const whereClause = where ? `WHERE ${where}` : '';

        const countQuery = `
            SELECT COUNT(*) AS total
            FROM ${table}
            ${whereClause}
        `;

        const dataQuery = `
            SELECT ${columns}
            FROM ${table}
            ${whereClause}
            ${orderBy ? `ORDER BY ${orderBy}` : ''}
            ${this.buildPaginationClause(offset, pageSize)}
            FOR JSON PATH
        `;

        return { dataQuery, countQuery };
    }

    /**
     * Format paginated response
     * @param {Array} data - Data array
     * @param {number} total - Total count
     * @param {Object} pagination - Pagination params
     * @returns {Object} Formatted response
     */
    static formatResponse(data, total, { page, pageSize }) {
        return {
            success: true,
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
                hasNext: page * pageSize < total,
                hasPrevious: page > 1,
            },
        };
    }
}

module.exports = PaginationHelper;
```

**Usage in Service**:

```javascript
async getAllPaginated(query) {
    const { page, pageSize, offset } = PaginationHelper.parsePaginationParams(query);

    const { dataQuery, countQuery } = PaginationHelper.buildPaginatedQueries({
        table: 'dbo.control',
        columns: '*',
        orderBy: 'sort_order',
        offset,
        pageSize,
    });

    // Execute both queries
    const [countResult, dataResult] = await Promise.all([
        db.executeQuery(countQuery),
        db.queryJson(dataQuery),
    ]);

    const total = countResult.recordset[0].total;
    return PaginationHelper.formatResponse(dataResult, total, { page, pageSize });
}
```

### 8. Audit Logger (Track Changes)

Automatically log who changed what and when:

```javascript
// utils/audit-logger.js
const db = require('../services/database.service');
const logger = require('../config/logger');

class AuditLogger {
    /**
     * Log an audit event
     * @param {Object} event
     * @param {string} event.action - CREATE, UPDATE, DELETE, etc.
     * @param {string} event.table - Table name
     * @param {string} event.recordId - Record identifier
     * @param {Object} event.oldValues - Previous values
     * @param {Object} event.newValues - New values
     * @param {string} event.userId - User who made the change
     * @param {string} event.ipAddress - IP address
     */
    static async log({ action, table, recordId, oldValues, newValues, userId, ipAddress }) {
        try {
            await db.executeQuery(
                `INSERT INTO dbo.audit_log 
                 (action, table_name, record_id, old_values, new_values, user_id, ip_address, created_at)
                 VALUES (@action, @table_name, @record_id, @old_values, @new_values, @user_id, @ip_address, GETDATE())`,
                {
                    action,
                    tableName: table,
                    recordId: String(recordId),
                    oldValues: oldValues ? JSON.stringify(oldValues) : null,
                    newValues: newValues ? JSON.stringify(newValues) : null,
                    userId: userId || 'system',
                    ipAddress: ipAddress || 'unknown',
                }
            );
        } catch (error) {
            // Don't fail the operation if audit logging fails
            logger.error('Audit logging failed', { error: error.message, action, table });
        }
    }

    /**
     * Create middleware for automatic audit logging
     * @param {string} table - Table name
     * @returns {Function} Express middleware
     */
    static middleware(table) {
        return async (req, res, next) => {
            // Store original json method
            const originalJson = res.json.bind(res);

            res.json = function (body) {
                // Log after successful response
                if (body.success) {
                    const action =
                        req.method === 'POST'
                            ? 'CREATE'
                            : req.method === 'PUT'
                            ? 'UPDATE'
                            : req.method === 'DELETE'
                            ? 'DELETE'
                            : 'READ';

                    if (action !== 'READ') {
                        AuditLogger.log({
                            action,
                            table,
                            recordId: req.params.code || req.params.id || 'unknown',
                            newValues: req.body,
                            userId: req.user?.id || 'anonymous',
                            ipAddress: req.ip,
                        }).catch(() => {}); // Fire and forget
                    }
                }

                return originalJson(body);
            };

            next();
        };
    }
}

module.exports = AuditLogger;
```

**Usage**:

```javascript
// In routes
router.post(
    '/',
    AuditLogger.middleware('control'),
    asyncHandler(async (req, res) => {
        const control = await controlService.create(req.body);
        res.json({ success: true, data: control });
    })
);

// Or in service layer
await AuditLogger.log({
    action: 'UPDATE',
    table: 'control',
    recordId: code,
    oldValues: oldControl,
    newValues: newControl,
    userId: req.user?.id,
});
```

### 9. Enhanced Database Service with Additional Utilities

Add bulk operations and performance monitoring:

```javascript
// Add to services/database.service.js

/**
 * Bulk insert multiple records efficiently
 * @param {string} table - Table name
 * @param {Array<Object>} records - Array of records (camelCase)
 * @returns {Promise<number>} Number of inserted records
 */
async bulkInsert(table, records) {
    if (!records || records.length === 0) return 0;

    const startTime = Date.now();
    const dbRecords = records.map(r => CaseConverter.keysToSnakeCase(r));

    // Get columns from first record
    const columns = Object.keys(dbRecords[0]);
    const columnList = columns.join(', ');

    // Build VALUES clauses
    const valueClauses = dbRecords.map((_, index) => {
        const params = columns.map(col => `@${col}${index}`).join(', ');
        return `(${params})`;
    }).join(', ');

    const query = `INSERT INTO ${table} (${columnList}) VALUES ${valueClauses}`;

    const pool = await this.connect();
    const request = pool.request();

    // Add all parameters
    dbRecords.forEach((record, index) => {
        columns.forEach(col => {
            request.input(`${col}${index}`, record[col]);
        });
    });

    try {
        const result = await request.query(query);
        const duration = Date.now() - startTime;
        logger.info('Bulk insert completed', { table, count: records.length, duration });
        return result.rowsAffected[0];
    } catch (error) {
        logger.error('Bulk insert failed', { table, error: error.message });
        throw error;
    }
}

/**
 * Execute query with performance monitoring
 * @param {string} query - SQL query
 * @param {Object} params - Parameters
 * @param {Object} options - { logSlow: boolean, slowThreshold: number }
 * @returns {Promise<Object>} Query result
 */
async executeQueryWithMonitoring(query, params = {}, options = {}) {
    const { logSlow = true, slowThreshold = 1000 } = options;
    const startTime = Date.now();

    try {
        const result = await this.executeQuery(query, params);
        const duration = Date.now() - startTime;

        if (logSlow && duration > slowThreshold) {
            logger.warn('Slow query detected', {
                duration,
                query: query.substring(0, 200),
                params: Object.keys(params),
            });
        }

        return result;
    } catch (error) {
        const duration = Date.now() - startTime;
        logger.error('Query failed', { duration, error: error.message });
        throw error;
    }
}

/**
 * Soft delete a record (sets deleted_at timestamp)
 * @param {string} table - Table name
 * @param {Object} where - Where conditions
 * @param {string} userId - User performing delete
 * @returns {Promise<boolean>}
 */
async softDelete(table, where, userId = 'system') {
    const dbWhere = CaseConverter.keysToSnakeCase(where);
    const conditions = Object.keys(dbWhere)
        .map(key => `${key} = @${key}`)
        .join(' AND ');

    const query = `
        UPDATE ${table}
        SET deleted_at = GETDATE(), deleted_by = @deleted_by
        WHERE ${conditions} AND deleted_at IS NULL
    `;

    const result = await this.executeQuery(query, {
        ...dbWhere,
        deletedBy: userId,
    });

    return result.rowsAffected[0] > 0;
}
```

### 10. Request Context Middleware (Debugging & Tracing)

Track requests across the system:

```javascript
// middleware/request-context.js
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * Add request context for tracking and debugging
 */
function requestContext(req, res, next) {
    // Generate or extract correlation ID
    req.correlationId = req.headers['x-correlation-id'] || uuidv4();

    // Add to response headers
    res.setHeader('X-Correlation-ID', req.correlationId);

    // Track request start time
    req.startTime = Date.now();

    // Log request
    logger.info('Request started', {
        correlationId: req.correlationId,
        method: req.method,
        path: req.path,
        ip: req.ip,
        userAgent: req.headers['user-agent'],
    });

    // Log response
    res.on('finish', () => {
        const duration = Date.now() - req.startTime;
        logger.info('Request completed', {
            correlationId: req.correlationId,
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
        });
    });

    next();
}

module.exports = requestContext;
```

### 11. Connection Retry Logic (Resilience)

Handle temporary database connection failures:

```javascript
// Add to services/database.service.js

async connectWithRetry(maxRetries = 3, delay = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (!this.pool) {
                this.pool = await sql.connect(config);
                logger.info('Database connected', { attempt });
            }
            return this.pool;
        } catch (error) {
            logger.warn('Database connection failed', {
                attempt,
                maxRetries,
                error: error.message
            });

            if (attempt === maxRetries) {
                throw new Error(`Failed to connect after ${maxRetries} attempts: ${error.message}`);
            }

            // Wait before retry with exponential backoff
            await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
    }
}
```

---

## Refactored Service Layer (Using Utilities)

Now services become much simpler with utilities:

```javascript
// services/control.service.js
const db = require('./database.service');
const QueryBuilder = require('../utils/query-builder');
const ValidationHelper = require('../utils/validation');
const { ValidationError, NotFoundError } = require('../utils/errors');

// NO manual column mapping needed! Automatic snake_case → camelCase conversion
// Just list the columns you want from the database
const CONTROL_COLUMNS = [
    'code',
    'atomic_level_code', // → atomicLevelCode automatically
    'type',
    'label',
    'sort_order', // → sortOrder automatically
    'width',
    'is_required', // → isRequired automatically
    'is_readonly', // → isReadonly automatically
    // ... other columns
];

class ControlService {
    async getAll() {
        const query = QueryBuilder.buildJsonQuery({
            table: 'dbo.control',
            columns: CONTROL_COLUMNS, // or just '*' for all columns!
            orderBy: 'atomic_level_code, type, code',
        });

        return await db.queryJson(query); // Returns camelCase automatically!
    }

    async getById(code) {
        const query = QueryBuilder.buildJsonQuery({
            table: 'dbo.control',
            columns: CONTROL_COLUMNS,
            where: { code }, // Can use camelCase here too!
            singleObject: true,
        });

        const result = await db.queryJson(query, { code }, true);
        if (!result) {
            throw new NotFoundError(`Control '${code}' not found`);
        }
        return result; // Already in camelCase!
    }

    async create(data) {
        // Validate using schema
        ValidationHelper.validate(data, ValidationHelper.schemas.control);

        // Business validation
        if (data.atomic_level_code === 'BASE') {
            throw new ValidationError('BASE controls cannot be created via API');
        }

        // Check existence using utility
        if (await db.exists('dbo.control', { code: data.code })) {
            throw new ValidationError(`Control '${data.code}' already exists`);
        }

        // Insert
        await db.executeQuery(
            `INSERT INTO dbo.control (code, atomic_level_code, type, label, sort_order)
             VALUES (@code, @atomic_level_code, @type, @label, @sort_order)`,
            data
        );

        return await this.getById(data.code);
    }

    async update(code, data) {
        // Check if exists
        await this.getById(code); // Throws NotFoundError if not found

        // Build dynamic UPDATE query
        const setClause = Object.keys(data)
            .map((key) => `${key} = @${key}`)
            .join(', ');

        await db.executeQuery(`UPDATE dbo.control SET ${setClause} WHERE code = @code`, {
            ...data,
            code,
        });

        return await this.getById(code);
    }

    async delete(code) {
        await this.getById(code); // Ensure exists
        await db.executeQuery('DELETE FROM dbo.control WHERE code = @code', { code });
    }

    // --- Advanced Operations with New Utilities ---

    /**
     * Get paginated list of controls
     */
    async getAllPaginated(query) {
        const { page, pageSize, offset } = PaginationHelper.parsePaginationParams(query);

        const { dataQuery, countQuery } = PaginationHelper.buildPaginatedQueries({
            table: 'dbo.control',
            columns: '*',
            where: query.type ? `type = '${query.type}'` : null,
            orderBy: 'sort_order, code',
            offset,
            pageSize,
        });

        const [countResult, data] = await Promise.all([
            db.executeQuery(countQuery),
            db.queryJson(dataQuery),
        ]);

        const total = countResult.recordset[0].total;
        return PaginationHelper.formatResponse(data, total, { page, pageSize });
    }

    /**
     * Bulk create controls with transaction
     */
    async bulkCreate(controls, userId) {
        return await TransactionManager.execute(async (tx) => {
            const created = [];

            for (const control of controls) {
                // Validate
                ValidationHelper.validate(control, ValidationHelper.schemas.control);

                // Insert
                await TransactionManager.query(
                    tx,
                    `INSERT INTO dbo.control (code, atomic_level_code, type, label, sort_order)
                     VALUES (@code, @atomic_level_code, @type, @label, @sort_order)`,
                    control
                );

                created.push(control.code);
            }

            // Log audit
            await AuditLogger.log({
                action: 'BULK_CREATE',
                table: 'control',
                recordId: created.join(','),
                newValues: { count: created.length },
                userId,
            });

            return created;
        });
    }

    /**
     * Update with audit trail
     */
    async updateWithAudit(code, data, userId) {
        const oldControl = await this.getById(code);

        const setClause = Object.keys(data)
            .map((k) => `${k} = @${k}`)
            .join(', ');

        await db.executeQuery(`UPDATE dbo.control SET ${setClause} WHERE code = @code`, {
            ...data,
            code,
        });

        // Log audit
        await AuditLogger.log({
            action: 'UPDATE',
            table: 'control',
            recordId: code,
            oldValues: oldControl,
            newValues: data,
            userId,
        });

        return await this.getById(code);
    }

    /**
     * Soft delete control
     */
    async softDelete(code, userId) {
        await this.getById(code); // Ensure exists
        const deleted = await db.softDelete('dbo.control', { code }, userId);

        if (deleted) {
            await AuditLogger.log({
                action: 'DELETE',
                table: 'control',
                recordId: code,
                userId,
            });
        }

        return deleted;
    }
}

module.exports = new ControlService();
```

---

## Refactored Routes Layer (Using Utilities)

Routes become trivial with RouteFactory:

```javascript
// routes/controls.js
const RouteFactory = require('../utils/route-factory');
const controlService = require('../services/control.service');
const ValidationHelper = require('../utils/validation');

// Create standard CRUD routes with one line!
const router = RouteFactory.createCrudRoutes(controlService, {
    resourceName: 'Control',
    idParam: 'code',
    validationSchema: ValidationHelper.schemas.control,
    customRoutes: (router, service) => {
        // Add custom routes if needed
        router.get('/hierarchy/:code', async (req, res) => {
            const hierarchy = await service.getHierarchy(req.params.code);
            res.json({ success: true, data: hierarchy });
        });
    },
});

module.exports = router;
```

**That's it! 10 lines instead of 100+**

---

## Configuration Management

### Environment Configuration

```javascript
// config/environment.js
require('dotenv').config();

const required = ['DB_SERVER', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'];

required.forEach((key) => {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
});

module.exports = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: parseInt(process.env.PORT) || 3001,

    database: {
        server: process.env.DB_SERVER,
        port: parseInt(process.env.DB_PORT) || 1433,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        options: {
            encrypt: true,
            trustServerCertificate: true,
        },
        pool: {
            max: 10,
            min: 0,
            idleTimeoutMillis: 30000,
        },
    },
};
```

### Database Configuration

```javascript
// config/database.js
const env = require('./environment');

module.exports = env.database;
```

---

## Error Handling

### Custom Errors

```javascript
// utils/errors.js
class AppError extends Error {
    constructor(message, statusCode = 500, isOperational = true) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

class ValidationError extends AppError {
    constructor(message) {
        super(message, 400);
    }
}

class NotFoundError extends AppError {
    constructor(message) {
        super(message, 404);
    }
}

class DatabaseError extends AppError {
    constructor(message, originalError) {
        super(message, 500, false);
        this.originalError = originalError;
    }
}

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = {
    AppError,
    ValidationError,
    NotFoundError,
    DatabaseError,
    asyncHandler,
};
```

### Error Handler Middleware

```javascript
// middleware/error-handler.js
const logger = require('../config/logger');
const { AppError } = require('../utils/errors');

function errorHandler(err, req, res, next) {
    // Log error
    const logLevel = err.statusCode >= 500 ? 'error' : 'warn';
    logger[logLevel]('Request error', {
        method: req.method,
        url: req.url,
        error: err.message,
        stack: err.stack,
    });

    // Send response
    const statusCode = err.statusCode || 500;
    const message = err.message || 'Internal Server Error';

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
}

module.exports = errorHandler;
```

---

## Validation

### Simple Validation Middleware

```javascript
// middleware/validation.js
const { ValidationError } = require('../utils/errors');

function validateControlData(req, res, next) {
    const { code, atomic_level_code, type, label } = req.body;

    const errors = [];

    if (!code || typeof code !== 'string') {
        errors.push('code is required and must be a string');
    }

    if (
        !atomic_level_code ||
        !['BASE', 'COMPOSITE', 'SECTION', 'TAB', 'GROUP'].includes(atomic_level_code)
    ) {
        errors.push('atomic_level_code is required and must be valid');
    }

    if (!type || typeof type !== 'string') {
        errors.push('type is required and must be a string');
    }

    if (!label || typeof label !== 'string') {
        errors.push('label is required and must be a string');
    }

    if (errors.length > 0) {
        throw new ValidationError(`Validation failed: ${errors.join(', ')}`);
    }

    next();
}

module.exports = {
    validateControlData,
};
```

---

## Logging

### Simple Logger

```javascript
// config/logger.js
const winston = require('winston');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
        }),
        new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
        }),
    ],
});

// Override console methods in production
if (process.env.NODE_ENV === 'production') {
    console.log = logger.info.bind(logger);
    console.error = logger.error.bind(logger);
    console.warn = logger.warn.bind(logger);
}

module.exports = logger;
```

---

## Application Setup

### App Configuration

```javascript
// app.js
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');

const errorHandler = require('./middleware/error-handler');
const corsConfig = require('./middleware/cors-config');
const requestContext = require('./middleware/request-context');

// Routes
const formAdminRoutes = require('./routes/form-admin');
const formRoutes = require('./routes/forms');
const controlRoutes = require('./routes/controls');
const domainRoutes = require('./routes/domains');

const app = express();

// Security & parsing
app.use(helmet());
app.use(corsConfig);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request tracking
app.use(requestContext);

// Health check with database status
app.get('/health', async (req, res) => {
    const db = require('./services/database.service');
    try {
        await db.executeQuery('SELECT 1');
        res.json({
            status: 'ok',
            timestamp: new Date().toISOString(),
            database: 'connected',
        });
    } catch (error) {
        res.status(503).json({
            status: 'error',
            timestamp: new Date().toISOString(),
            database: 'disconnected',
            error: error.message,
        });
    }
});

// API routes
app.use('/api/form-admin', formAdminRoutes);
app.use('/api/forms', formRoutes);
app.use('/api/controls', controlRoutes);
app.use('/api/domains', domainRoutes);

// Error handling (must be last)
app.use(errorHandler);

module.exports = app;
```

### Server Startup

```javascript
// server.js
const app = require('./app');
const databaseService = require('./services/database.service');
const logger = require('./config/logger');
const env = require('./config/environment');

async function startServer() {
    try {
        // Connect to database with retry
        await databaseService.connectWithRetry();

        // Start server
        const server = app.listen(env.PORT, () => {
            logger.info(`Server running on port ${env.PORT} in ${env.NODE_ENV} mode`);
        });

        // Graceful shutdown
        const shutdown = async (signal) => {
            logger.info(`${signal} received, shutting down gracefully`);

            server.close(async () => {
                logger.info('HTTP server closed');

                try {
                    await databaseService.close();
                    logger.info('Database connection closed');
                    process.exit(0);
                } catch (error) {
                    logger.error('Error during shutdown', { error: error.message });
                    process.exit(1);
                }
            });

            // Force shutdown after 10 seconds
            setTimeout(() => {
                logger.error('Forced shutdown after timeout');
                process.exit(1);
            }, 10000);
        };

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));
    } catch (error) {
        logger.error('Failed to start server', { error: error.message });
        process.exit(1);
    }
}

startServer();
```

---

## Testing Strategy

### Unit Tests (Simplified with Utilities)

Testing is much easier with utilities since they're pre-tested:

```javascript
// tests/unit/control.service.test.js
const controlService = require('../../services/control.service');
const db = require('../../services/database.service');

// Mock database service (utility already tested)
jest.mock('../../services/database.service');

describe('ControlService', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('create', () => {
        it('should create a control successfully', async () => {
            const controlData = {
                code: 'TEST_CONTROL',
                atomic_level_code: 'SECTION',
                type: 'text',
                label: 'Test Control',
            };

            db.exists.mockResolvedValue(false);
            db.executeQuery.mockResolvedValue();
            db.queryJson.mockResolvedValue(controlData);

            const result = await controlService.create(controlData);

            expect(result).toEqual(controlData);
            expect(db.exists).toHaveBeenCalledWith('dbo.control', { code: 'TEST_CONTROL' });
        });

        it('should throw ValidationError for BASE controls', async () => {
            const controlData = {
                code: 'BASE_CONTROL',
                atomic_level_code: 'BASE',
                type: 'text',
                label: 'Base Control',
            };

            await expect(controlService.create(controlData)).rejects.toThrow(
                'BASE controls cannot be created via API'
            );
        });
    });
});
```

### Integration Tests

```javascript
// tests/integration/control.routes.test.js
const request = require('supertest');
const app = require('../../app');
const db = require('../../services/database.service');

describe('Control Routes', () => {
    beforeAll(async () => {
        await db.connect();
    });

    afterAll(async () => {
        await db.close();
    });

    describe('POST /api/controls', () => {
        it('should create a control', async () => {
            const controlData = {
                code: 'INTEGRATION_TEST_CONTROL',
                atomic_level_code: 'SECTION',
                type: 'text',
                label: 'Integration Test Control',
            };

            const response = await request(app).post('/api/controls').send(controlData).expect(201);

            expect(response.body.success).toBe(true);
            expect(response.body.data.code).toBe(controlData.code);
        });

        it('should return 400 for invalid data', async () => {
            const response = await request(app)
                .post('/api/controls')
                .send({ invalid: 'data' })
                .expect(400);

            expect(response.body.success).toBe(false);
        });
    });
});
```

---

## Package.json Dependencies

```json
{
    "name": "lex-form-backend",
    "version": "1.0.0",
    "main": "server.js",
    "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js",
        "test": "jest",
        "test:watch": "jest --watch",
        "test:coverage": "jest --coverage"
    },
    "dependencies": {
        "express": "^4.18.2",
        "mssql": "^10.0.1",
        "cors": "^2.8.5",
        "helmet": "^7.1.0",
        "dotenv": "^16.3.1",
        "winston": "^3.11.0",
        "uuid": "^9.0.0"
    },
    "devDependencies": {
        "nodemon": "^3.0.1",
        "jest": "^29.7.0",
        "supertest": "^6.3.3"
    },
    "jest": {
        "testEnvironment": "node",
        "collectCoverageFrom": ["services/**/*.js", "routes/**/*.js", "utils/**/*.js"]
    }
}
```

---

## Additional Practical Improvements

### Production-Ready Features

Beyond the core utilities, these additional features are commonly needed in production:

#### 1. **Transaction Support** ✅ Added

-   Ensures data integrity for multi-step operations
-   Automatic rollback on errors
-   Critical for operations like creating controls with associations

#### 2. **Pagination** ✅ Added

-   Essential for handling large datasets
-   Prevents memory issues with large result sets
-   Standard pagination response format
-   Configurable page sizes with max limits

#### 3. **Audit Logging** ✅ Added

-   Track who changed what and when
-   Required for compliance and debugging
-   Non-blocking (doesn't fail operations if logging fails)
-   Can be middleware or explicit in services

#### 4. **Soft Deletes** ✅ Added

-   Preserve data instead of hard deletes
-   Easy recovery of accidentally deleted data
-   Audit trail of deletions
-   Can filter out deleted records in queries

#### 5. **Bulk Operations** ✅ Added

-   Efficient insertion of multiple records
-   Reduces database round trips
-   Transaction support for atomicity
-   Useful for data imports and migrations

#### 6. **Performance Monitoring** ✅ Added

-   Track slow queries automatically
-   Log query execution times
-   Helps identify performance bottlenecks
-   Production debugging

#### 7. **Connection Retry Logic** ✅ Added

-   Handle temporary database failures
-   Exponential backoff
-   Configurable retry attempts
-   Improves resilience

#### 8. **Request Context/Correlation IDs** ✅ Added

-   Track requests across distributed systems
-   Essential for debugging
-   Links logs across multiple services
-   Included in all log entries

### Security Enhancements

```javascript
// middleware/security.js

const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.',
});

// Input sanitization
function sanitizeInput(req, res, next) {
    // Remove any null bytes
    if (req.body) {
        req.body = JSON.parse(JSON.stringify(req.body).replace(/\\u0000/g, ''));
    }
    next();
}

module.exports = { limiter, sanitizeInput };
```

### Database Schema Requirements

For the utilities to work effectively, ensure these table structures:

```sql
-- Soft delete columns (add to all tables)
ALTER TABLE dbo.control ADD
    deleted_at DATETIME2 NULL,
    deleted_by NVARCHAR(100) NULL;

-- Audit log table
CREATE TABLE dbo.audit_log (
    id BIGINT IDENTITY(1,1) PRIMARY KEY,
    action NVARCHAR(50) NOT NULL,
    table_name NVARCHAR(100) NOT NULL,
    record_id NVARCHAR(100) NOT NULL,
    old_values NVARCHAR(MAX) NULL,
    new_values NVARCHAR(MAX) NULL,
    user_id NVARCHAR(100) NOT NULL,
    ip_address NVARCHAR(50) NULL,
    created_at DATETIME2 NOT NULL DEFAULT GETDATE()
);

-- Indexes for performance
CREATE INDEX IX_audit_log_table_record
    ON dbo.audit_log(table_name, record_id);
CREATE INDEX IX_audit_log_created_at
    ON dbo.audit_log(created_at DESC);
CREATE INDEX IX_control_deleted_at
    ON dbo.control(deleted_at)
    WHERE deleted_at IS NOT NULL;
```

### Environment Variables

Update `.env` file with additional configurations:

```bash
# Database
DB_SERVER=localhost
DB_PORT=1433
DB_NAME=LexForm
DB_USER=sa
DB_PASSWORD=your_password

# Server
NODE_ENV=development
PORT=3001

# Logging
LOG_LEVEL=info

# Performance
SLOW_QUERY_THRESHOLD=1000
DB_CONNECTION_RETRY_ATTEMPTS=3

# Pagination
DEFAULT_PAGE_SIZE=20
MAX_PAGE_SIZE=100

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Utility Priority Matrix

| Utility            | Priority | Effort | Impact    | When to Add                |
| ------------------ | -------- | ------ | --------- | -------------------------- |
| CaseConverter      | Critical | Low    | Very High | Day 1 - Foundation         |
| DatabaseService    | Critical | Medium | Very High | Day 1 - Foundation         |
| ErrorHandling      | Critical | Low    | High      | Day 1 - Foundation         |
| ValidationHelper   | High     | Medium | High      | Day 1 - Foundation         |
| TransactionManager | High     | Low    | High      | When multi-step ops needed |
| PaginationHelper   | High     | Low    | Medium    | When lists grow large      |
| RouteFactory       | Medium   | High   | Very High | Day 2 - Optimization       |
| AuditLogger        | Medium   | Low    | Medium    | When compliance needed     |
| QueryBuilder       | Medium   | Medium | Medium    | When queries get complex   |
| RequestContext     | Medium   | Low    | Medium    | When debugging distributed |
| SoftDelete         | Low      | Low    | Low       | When recovery needed       |
| BulkOperations     | Low      | Medium | Medium    | When importing data        |

### Best Practices

1. **Start Small**: Implement core utilities first (CaseConverter, DatabaseService, ErrorHandling)
2. **Add Incrementally**: Add other utilities as specific needs arise
3. **Test Thoroughly**: Pre-test utilities since they're reused everywhere
4. **Document Usage**: Provide examples for each utility
5. **Monitor Performance**: Use slow query logging from day one
6. **Plan for Scale**: Add pagination early, even if data is small now
7. **Security First**: Implement rate limiting and input sanitization
8. **Graceful Degradation**: Audit logging shouldn't break operations if it fails

### Optional Advanced Features

Consider these for future enhancements:

-   **Caching Layer**: Redis for frequently accessed data
-   **API Versioning**: `/api/v1/` prefixes for backward compatibility
-   **WebSockets**: For real-time form updates
-   **Background Jobs**: Bull/BullMQ for long-running tasks
-   **GraphQL**: Alternative to REST for flexible queries
-   **OpenAPI/Swagger**: Auto-generated API documentation
-   **Health Checks**: Advanced checks for dependencies
-   **Metrics**: Prometheus/Grafana for monitoring
-   **Database Migrations**: Automated schema versioning
-   **Feature Flags**: Toggle features without deployment

---

## Code Reduction Impact

### Before vs After Comparison

#### Route Handler: 100+ lines → 10 lines

**Before (repetitive)**:

```javascript
router.get('/controls', async (req, res) => {
    try {
        const query = `SELECT ... FOR JSON PATH`;
        const result = await sql.query(query);
        let controls = [];
        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            const jsonString = result.recordset[0][jsonKey];
            try {
                controls = JSON.parse(jsonString);
            } catch (e) {
                console.error('Invalid JSON:', e);
                controls = [];
            }
        }
        res.json(controls);
    } catch (err) {
        console.error('Error:', err);
        res.status(500).json({ error: 'Failed', details: err.message });
    }
});

router.post('/controls', async (req, res) => {
    try {
        // 50 more lines of validation, existence check, insert, and response
    } catch (err) {
        // error handling
    }
});

// ... 5 more endpoints = 500+ lines total
```

**After (with utilities)**:

```javascript
const router = RouteFactory.createCrudRoutes(controlService, {
    resourceName: 'Control',
    idParam: 'code',
    validationSchema: ValidationHelper.schemas.control,
});

module.exports = router;
```

#### Service Layer: 150+ lines → 40 lines

**Before**:

```javascript
async function getAllControls() {
    try {
        const query = `SELECT ... FOR JSON PATH`;
        const request = new sql.Request();
        const result = await request.query(query);
        if (result.recordset.length > 0) {
            const jsonKey = Object.keys(result.recordset[0])[0];
            return JSON.parse(result.recordset[0][jsonKey]);
        }
        return [];
    } catch (err) {
        console.error('Error:', err);
        throw err;
    }
}

async function controlExists(code) {
    try {
        const query = `SELECT code FROM dbo.control WHERE code = @code`;
        const request = new sql.Request();
        request.input('code', sql.VarChar, code);
        const result = await request.query(query);
        return result.recordset.length > 0;
    } catch (err) {
        console.error('Error:', err);
        throw err;
    }
}

// ... 5 more similar functions
```

**After**:

```javascript
async getAll() {
    return await db.queryJson(
        QueryBuilder.buildJsonQuery({
            table: 'dbo.control',
            columns: '*', // NO manual column mapping!
            orderBy: 'atomic_level_code, type, code',
        })
    );
    // Returns: { code, atomicLevelCode, type, ... } ← camelCase automatically!
}

async exists(code) {
    return await db.exists('dbo.control', { code });
}
```

### Overall Code Reduction

| Component      | Before         | After         | Reduction |
| -------------- | -------------- | ------------- | --------- |
| Routes         | 500 lines      | 50 lines      | **90%**   |
| Services       | 800 lines      | 200 lines     | **75%**   |
| Validation     | 300 lines      | 50 lines      | **83%**   |
| Error Handling | 200 lines      | 30 lines      | **85%**   |
| **Total**      | **1800 lines** | **330 lines** | **82%**   |

### Utilities Created (One-Time Investment)

| Utility             | Lines         | Reusable Across     |
| ------------------- | ------------- | ------------------- |
| DatabaseService     | 80            | All services        |
| QueryBuilder        | 60            | All services        |
| RouteFactory        | 100           | All routes          |
| ValidationHelper    | 90            | All routes/services |
| ResponseFormatter   | 40            | All routes          |
| **Total Utilities** | **370 lines** | **Entire codebase** |

**Net Result**: 370 utility lines replace 1800 lines of repetitive code = **80% reduction**

---

## Customization Flexibility

While utilities reduce boilerplate, they still allow customization:

### 1. Custom Route Logic

```javascript
// routes/controls.js
const router = RouteFactory.createCrudRoutes(controlService, {
    resourceName: 'Control',
    customRoutes: (router, service) => {
        // Add custom endpoints
        router.get(
            '/hierarchy/:code',
            asyncHandler(async (req, res) => {
                const hierarchy = await service.getHierarchy(req.params.code);
                res.json(ResponseFormatter.success(hierarchy));
            })
        );

        // Override default behavior
        router.post('/', [
            customAuthMiddleware,
            ValidationHelper.createMiddleware(customSchema),
            asyncHandler(async (req, res) => {
                // Custom create logic
            }),
        ]);
    },
});
```

### 2. Custom Service Logic

```javascript
// services/control.service.js
class ControlService {
    // Use utilities for standard operations
    async getAll() {
        return await db.queryJson(QueryBuilder.buildJsonQuery({...}));
    }

    // Custom complex logic
    async getHierarchy(code) {
        // Complex hierarchical query not covered by utilities
        const query = `
            WITH RECURSIVE hierarchy AS (
                ...custom recursive CTE...
            )
            SELECT * FROM hierarchy FOR JSON PATH
        `;
        return await db.queryJson(query, { code });
    }
}
```

### 3. Custom Validation Rules

```javascript
// Custom validation schema with business rules
const customControlSchema = {
    ...ValidationHelper.schemas.control,
    code: {
        ...ValidationHelper.schemas.control.code,
        custom: (value, data) => {
            // Custom business rule
            if (value.startsWith('SYS_')) {
                return 'Control codes cannot start with SYS_';
            }
            return null;
        },
    },
};
```

### 4. Selective Utility Usage

You're not forced to use utilities everywhere:

```javascript
// Option 1: Use all utilities (recommended for 90% of cases)
const router = RouteFactory.createCrudRoutes(service, {...});

// Option 2: Mix utilities with custom code
router.get('/', asyncHandler(async (req, res) => {
    const data = await db.queryJson(customQuery); // Use db utility
    res.json(ResponseFormatter.success(data));    // Use response utility
}));

// Option 3: Write fully custom code when needed (complex edge cases)
router.post('/complex', async (req, res) => {
    try {
        // Fully custom implementation for unique requirements
    } catch (err) {
        // Handle errors
    }
});
```

---

## Migration Strategy

### Phase 1: Build Utilities (1 day)

1. Create utility files:
    - `utils/case-converter.js` - **snake_case ↔ camelCase (CRITICAL!)**
    - `utils/errors.js` - Custom error classes
    - `utils/query-builder.js` - SQL query construction
    - `utils/validation.js` - Schema-based validation
    - `utils/route-factory.js` - Generic route creator
    - `utils/response.js` - Response formatters
2. Create enhanced database service:

    - `services/database.service.js` with `queryJson()`, `exists()`, etc.

3. Write utility tests:
    - Test each utility independently
    - Ensure 100% coverage for utilities (they're reused everywhere)

### Phase 2: Refactor Services (1-2 days)

1. Update `control.service.js`:

    - Replace raw SQL queries with `QueryBuilder`
    - Use `db.queryJson()` instead of manual parsing
    - Use `ValidationHelper` for validation
    - Define column mappings as constants

2. Create `form.service.js` and `domain.service.js` using same pattern

3. Remove duplicate code across services

### Phase 3: Refactor Routes (1 day)

1. Replace `form_admin.js` endpoints:

    ```javascript
    // Before: 500 lines of route handlers
    // After:
    const router = RouteFactory.createCrudRoutes(controlService, {...});
    ```

2. Extract custom logic to service methods

3. Use `asyncHandler` for all routes

### Phase 4: Configuration & Middleware (0.5 day)

1. Set up:

    - `config/environment.js` - Centralized config
    - `config/logger.js` - Winston logger
    - `middleware/error-handler.js` - Global error handling

2. Update `app.js` to use middleware

### Phase 5: Testing & Polish (1 day)

1. Write tests for services (now much simpler)
2. Write integration tests for routes
3. Update documentation
4. Performance testing

### Total Effort: 4-5 days

### Benefits

-   **80% less code** to maintain
-   **Consistent patterns** across all endpoints
-   **Easier testing** with pre-tested utilities
-   **Faster development** for new features
-   **Better error handling** and validation
-   **More flexibility** for customization when needed

---

## Key Principles

1. **DRY (Don't Repeat Yourself)**: Extract common patterns into utilities
2. **Single Responsibility**: Each layer and utility has one clear purpose
3. **Composition Over Duplication**: Build complex features from simple utilities
4. **Convention Over Configuration**: Standard patterns with opt-in customization
5. **Progressive Enhancement**: Use utilities for 90% of cases, custom code for edge cases
6. **Testability First**: Pre-test utilities once, reuse everywhere
7. **Minimal Boilerplate**: Write only business logic, not infrastructure code

---

## Summary & Recommendations

### Current State

-   Mixed concerns in routes (business logic + DB + validation)
-   Repetitive code across endpoints
-   Manual JSON parsing and error handling everywhere
-   **Manual snake_case to camelCase mapping in every query**
-   ~1800 lines of boilerplate code

### Proposed Architecture Benefits

✅ **80% code reduction** through utilities  
✅ **Zero manual column mapping** - automatic case conversion  
✅ **Consistent patterns** across all endpoints  
✅ **Faster development** of new features  
✅ **Easier maintenance** with less code  
✅ **Better testing** with pre-tested utilities  
✅ **Flexible customization** when needed

### Critical Feature: Automatic Case Conversion

This single feature provides massive value:

**Eliminates**:

-   Manual column mapping objects (50-100 lines per service)
-   Case conversion bugs and typos
-   Maintenance burden when adding/removing columns
-   Inconsistent naming between DB and UI

**Provides**:

-   Seamless integration between snake_case DB and camelCase UI
-   Automatic bidirectional conversion
-   Developer writes natural camelCase in JavaScript
-   Database receives correct snake_case automatically

**Example impact**:

```javascript
// Before: 50 lines of manual mapping per service
const COLUMNS = {
    code: 'code',
    atomic_level_code: 'atomicLevelCode',
    sort_order: 'sortOrder',
    // ... 20 more lines
};

// After: 0 lines - just use column names
columns: '*'; // Automatic conversion!
```

### Utility Investment vs Return

| Investment                        | Return                        |
| --------------------------------- | ----------------------------- |
| 370 lines of utilities (one-time) | 1800+ lines eliminated        |
| 1 day to build utilities          | Save 3-4 days per new feature |
| Test utilities once               | All code using them is tested |

### Recommended Priority

1. **High Priority** (Do First):

    - DatabaseService with `queryJson()`, `exists()`
    - RouteFactory for CRUD operations
    - ValidationHelper for schema-based validation
    - Error handling utilities

2. **Medium Priority** (Nice to Have):

    - QueryBuilder for complex queries
    - ResponseFormatter for consistency
    - Logger configuration

3. **Low Priority** (Optional):
    - Advanced query builders
    - Caching utilities
    - Performance monitoring

### Quick Win Example

Create one complete CRUD resource using utilities:

```javascript
// 1. Define validation schema (5 lines)
const schema = ValidationHelper.schemas.control;

// 2. Create service using utilities (20 lines)
class ControlService {
    async getAll() { return await db.queryJson(...); }
    async getById(code) { return await db.queryJson(...); }
    async create(data) { /* validation + insert */ }
    async update(code, data) { /* update */ }
    async delete(code) { /* delete */ }
}

// 3. Create routes (3 lines!)
const router = RouteFactory.createCrudRoutes(controlService, {
    resourceName: 'Control',
    validationSchema: schema
});
```

**Total: 30 lines instead of 500 lines** ✨

This architecture strikes the perfect balance between **simplicity, reusability, and flexibility** - making it easy to maintain and extend while minimizing code repetition.

---

## Practical Implementation Roadmap

### Step 1: Create Core Utilities (Day 1 Morning)

Priority order for maximum impact:

```
1. utils/case-converter.js (30 min) ← START HERE!
   - This is the foundation for everything
   - Automatic snake_case ↔ camelCase conversion
   - Bidirectional key transformation

2. utils/errors.js (30 min)
   - Custom error classes
   - asyncHandler wrapper

3. services/database.service.js (1 hour)
   - executeQuery() with parameter inference & case conversion
   - queryJson() for JSON results with automatic camelCase
   - exists() for existence checks

4. utils/validation.js (1 hour)
   - Schema-based validation
   - Pre-defined schemas for control, form, etc.
```

### Step 2: Refactor One Complete Resource (Day 1 Afternoon)

Use controls as the reference implementation:

```
1. Create services/control.service.js using utilities (1 hour)
   - Simple CRUD with QueryBuilder
   - Complex hierarchy using existing fn_GetControlChildren
   - Test each method as you write it

2. Create routes/controls.js with RouteFactory (30 min)
   - Or manually create routes using utilities

3. Test the complete flow (30 min)
   - GET, POST, PUT, DELETE operations
   - Test hierarchy endpoints
```

### Step 3: Wrap Existing Complex Queries (Day 2 Morning)

Don't rewrite - just wrap with utilities:

```
1. Identify complex queries in server.js (30 min)
   - Form hierarchy query (uses fn_GetControlChildren)
   - Domain data queries
   - Any custom CTEs

2. Move to service layer with utility wrappers (1 hour)
   - Keep same SQL queries
   - Use db.queryJson() for execution
   - Add proper error handling

3. Update routes to use services (30 min)
   - Replace inline queries with service calls
   - Add validation and error handling
```

Copy and adapt the control implementation:

```
1. Form service + routes (1 hour)
2. Domain service + routes (1 hour)
3. Any other resources (1-2 hours)
```

### Step 4: Add RouteFactory (Day 2 Afternoon - Optional)

Only if you want maximum code reduction:

```
1. Create utils/route-factory.js (2 hours)
2. Refactor existing routes to use it (1 hour)
3. Document customization patterns (30 min)
```

### Step 5: Polish & Configuration (Day 3)

```
1. Setup config/environment.js (30 min)
2. Setup config/logger.js with Winston (30 min)
3. Create middleware/error-handler.js (30 min)
4. Update app.js to use middleware (30 min)
5. Write basic tests (2 hours)
```

### Total Timeline

-   **Minimum Viable**: 1.5 days (Steps 1-3)
-   **Recommended**: 2.5 days (Steps 1-4)
-   **Complete**: 3 days (All steps)

### Quick Reference: File Creation Order

```
Day 1:
✓ utils/case-converter.js (FIRST - everything depends on this!)
✓ utils/errors.js
✓ services/database.service.js (with case conversion)
✓ utils/validation.js
✓ services/control.service.js
✓ routes/controls.js

Day 2:
✓ services/form.service.js
✓ routes/forms.js
✓ services/domain.service.js
✓ routes/domains.js
✓ utils/route-factory.js (optional)

Day 3:
✓ config/environment.js
✓ config/logger.js
✓ middleware/error-handler.js
✓ Update app.js
✓ Write tests
```

### Measuring Success

After implementation, you should see:

1. **Code Metrics**:

    - Total backend LOC reduced by ~80%
    - Average route handler: 5-10 lines (vs 50-100)
    - Average service method: 10-15 lines (vs 40-60)

2. **Developer Experience**:

    - New CRUD resource: 30 minutes (vs 4 hours)
    - Bug fixes: Easier to locate and fix
    - Testing: Faster with pre-tested utilities

3. **Code Quality**:
    - Consistent error handling everywhere
    - Standardized validation patterns
    - Clear separation of concerns

---

## Appendix: Utility Quick Reference

### Case Converter Methods

```javascript
CaseConverter.toCamelCase('snake_case'); // → 'snakeCase'
CaseConverter.toSnakeCase('camelCase'); // → 'camel_case'
CaseConverter.keysToCamelCase(obj); // Convert all keys in object/array
CaseConverter.keysToSnakeCase(obj); // Convert all keys to snake_case
```

### Database Service Methods

```javascript
await db.connect(); // Connect to database
await db.connectWithRetry(maxRetries, delay); // Connect with retry logic
await db.executeQuery(sql, params); // Execute query (auto snake_case)
await db.queryJson(sql, params, single); // Query and parse JSON (auto camelCase)
await db.exists(table, where); // Check record existence
await db.bulkInsert(table, records); // Bulk insert (efficient)
await db.softDelete(table, where, userId); // Soft delete record
await db.executeQueryWithMonitoring(sql, params); // Query with performance tracking
await db.close(); // Close connection
// All methods automatically handle case conversion!
```

### Query Builder Methods

```javascript
QueryBuilder.buildJsonQuery({
    // Build SELECT with JSON PATH
    table,
    columns,
    where,
    orderBy,
    singleObject, // No manual column mapping!
});
```

### Validation Helper Methods

```javascript
ValidationHelper.validate(data, schema); // Validate against schema
ValidationHelper.createMiddleware(schema); // Create Express middleware
ValidationHelper.schemas.control; // Pre-defined schemas
```

### Route Factory Methods

```javascript
RouteFactory.createCrudRoutes(service, {
    // Create standard CRUD routes
    resourceName,
    idParam,
    validationSchema,
    customRoutes,
});
```

### Response Formatter Methods

```javascript
ResponseFormatter.success(data, message); // Success response
ResponseFormatter.error(error, status); // Error response
ResponseFormatter.created(data, location); // Created response
ResponseFormatter.paginated(data, pagination); // Paginated response
```

### Transaction Manager Methods

```javascript
await TransactionManager.execute(async (tx) => {
    // Execute in transaction
    await TransactionManager.query(tx, sql, params);
    // Multiple operations...
    return result;
});
```

### Pagination Helper Methods

```javascript
const { page, pageSize, offset } = PaginationHelper.parsePaginationParams(query);

const { dataQuery, countQuery } = PaginationHelper.buildPaginatedQueries({
    table,
    columns,
    where,
    orderBy,
    offset,
    pageSize,
});

const response = PaginationHelper.formatResponse(data, total, { page, pageSize });
```

### Audit Logger Methods

```javascript
await AuditLogger.log({
    // Log audit event
    action,
    table,
    recordId,
    oldValues,
    newValues,
    userId,
    ipAddress,
});

AuditLogger.middleware(tableName); // Auto-audit middleware
```

### Request Context

```javascript
// Access in any route handler
req.correlationId; // Unique request ID
req.startTime; // Request start timestamp
// Automatically logged and included in response headers
```

```

```
