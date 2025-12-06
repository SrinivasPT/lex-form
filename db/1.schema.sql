/*
    Database: Microsoft SQL Server
    Context: LexForm Generic Builder
    Architecture: Recursive Composite Pattern
        - Form -> Sections -> Controls
        - Sections and Controls are both represented by the 'control' table
        - Form will have multiple root-level controls (Sections)
        - Sections can have nested controls (Groups, Tables, Inputs)

    Naming Conventions:
    - Use snake_case for naming conventions.
    - Use singular nouns for table names.
    - Use lowercase for all identifiers.
    - Prefix foreign key columns with the referenced table name.
*/

USE lex_form_db
GO
-- =============================================
-- 1. DROP SCRIPT: Clean up tables
-- =============================================

-- Disable system versioning and drop tables in reverse dependency order

-- Drop control_group table (has foreign keys to form and itself)
ALTER TABLE dbo.control_group SET (SYSTEM_VERSIONING = OFF);
DROP TABLE IF EXISTS dbo.control_group_history;
DROP TABLE IF EXISTS dbo.control_group;

-- Drop control table (has foreign keys to form and itself)
ALTER TABLE dbo.control SET (SYSTEM_VERSIONING = OFF);
DROP TABLE IF EXISTS dbo.control_history;
DROP TABLE IF EXISTS dbo.control;

-- Drop form table
ALTER TABLE dbo.form SET (SYSTEM_VERSIONING = OFF);
DROP TABLE IF EXISTS dbo.form_history;
DROP TABLE IF EXISTS dbo.form;

-- Drop domain_data table
ALTER TABLE dbo.domain_data SET (SYSTEM_VERSIONING = OFF);
DROP TABLE IF EXISTS dbo.domain_data_history;
DROP TABLE IF EXISTS dbo.domain_data;

-- =============================================
-- 2. DOMAIN DATA (Master Data / Lookups)
-- =============================================
CREATE TABLE dbo.domain_data (
    category_code VARCHAR(128) NOT NULL,
    code VARCHAR(128) NOT NULL,
    display_text NVARCHAR(255) NOT NULL,
    parent_code VARCHAR(128), -- For cascading (e.g., State belongs to Country code)
    sort_order INT DEFAULT 0,
    is_active BIT DEFAULT 1,
    extension_json NVARCHAR(MAX), -- Extra data (e.g. currency symbol, country code)

    -- System Versioning
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

    PRIMARY KEY (category_code, code),
    CONSTRAINT chk_domain_json CHECK (ISJSON(extension_json) = 1)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.domain_data_history));

-- =============================================
-- 3. FORM (The Aggregate Root)
-- =============================================
CREATE TABLE dbo.form (
    code VARCHAR(128) PRIMARY KEY,
    version VARCHAR(32) NOT NULL, -- Semantic Versioning (1.0.0)
    label NVARCHAR(255) NOT NULL,
    description NVARCHAR(MAX),
    is_published BIT DEFAULT 0,

    -- System Versioning
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.form_history));

-- =============================================
-- 4. CONTROL (The Recursive Node)
--    Combines Sections, Tables, Groups, Inputs
-- =============================================
CREATE TABLE dbo.control (
    code VARCHAR(128) PRIMARY KEY,
    
    -- Hierarchy & Ownership
    form_code VARCHAR(128),
    parent_control_code VARCHAR(128) NULL, -- RECURSION: If NULL, it's a Root Level item (like a Main Section)
    atomic_level_code VARCHAR(20) NOT NULL, -- 'FORM', 'SECTION', 'COMPOSITE', 'BASE'. COMPOSITE = Group of controls or Table
    
    -- Identity & Visuals
    type VARCHAR(32) NOT NULL, -- 'GROUP', 'TABLE', 'TEXT', 'SELECT', 'DATE', 'CHECKBOX', 'RADIO', 'FILE', 'NUMBER'
    [key] VARCHAR(128),        -- Data Binding Key (camelCase)
    label NVARCHAR(255),
    placeholder NVARCHAR(255),
    help_text NVARCHAR(500),   -- Tooltip / Aria description
    sort_order INT NOT NULL DEFAULT 0,

    -- Layout (Responsive Grid)
    -- Storing as JSON is cleaner than columns: { "xs": 12, "md": 6 }
    layout_config NVARCHAR(MAX), 

    -- Data Binding Source (For auto-generation/validation)
    source_table VARCHAR(128),
    source_column VARCHAR(128),
    source_data_type VARCHAR(64),

    -- Domain Logic (Dropdowns/Cascading)
    category_code VARCHAR(128), -- Links to domain_data
    dependent_on VARCHAR(128),  -- Key of parent control

    -- Logic Expressions (Safe Strings)
    visible_when NVARCHAR(MAX),
    disabled_when NVARCHAR(MAX),
    required_when NVARCHAR(MAX),

    -- Common Validators (First-Class Columns for Querying)
    is_required BIT DEFAULT 0,
    is_readonly BIT DEFAULT 0,
    min_val INT,                -- 'min' is reserved keyword in some contexts, using min_val
    max_val INT,
    min_length INT,
    max_length INT,
    pattern NVARCHAR(255),      -- Regex
    
    -- Extended Configuration (JSON)
    -- Stores specific properties like:
    -- Table: { "pagination": { "enabled": true }, "rowActions": [...] }
    -- FileUpload: { "accept": ".pdf", "maxSize": 5000 }
    properties_json NVARCHAR(MAX),

    -- System Versioning
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

    -- Constraints
    CONSTRAINT fk_control_form FOREIGN KEY (form_code) REFERENCES form(code),
    CONSTRAINT fk_control_parent FOREIGN KEY (parent_control_code) REFERENCES control(code),
    CONSTRAINT chk_layout_json CHECK (ISJSON(layout_config) = 1),
    CONSTRAINT chk_props_json CHECK (ISJSON(properties_json) = 1),
    CONSTRAINT chk_min_max CHECK (min_val <= max_val),
    CONSTRAINT chk_len_min_max CHECK (min_length <= max_length)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.control_history));

-- =============================================
-- 5. CONTROL RELATIONSHIP (Dependencies & Mappings)
-- =============================================
CREATE TABLE dbo.control_group (
    control_code VARCHAR(128) NOT NULL,        -- The control that has the relationship
    child_control_code VARCHAR(128) NOT NULL, -- The control it relates to
    sort_order INT DEFAULT 0,

    -- System Versioning
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
    sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

    PRIMARY KEY (control_code, child_control_code),
    CONSTRAINT fk_rel_control FOREIGN KEY (control_code) REFERENCES control(code),
    CONSTRAINT fk_rel_child FOREIGN KEY (child_control_code) REFERENCES control(code)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.control_group_history));

-- Hierarchy Traversal Performance
CREATE INDEX idx_control_form_code ON dbo.control(form_code);
CREATE INDEX idx_control_parent_code ON dbo.control(parent_control_code);

-- Ordering
CREATE INDEX idx_control_sort_order ON dbo.control(sort_order);

-- Domain Lookups
CREATE INDEX idx_domain_category ON dbo.domain_data(category_code);

-- =============================================
-- 6. SAMPLE QUERY: How to retrieve the Tree
-- =============================================

/*
-- RECURSIVE CTE to fetch a Form Schema
WITH ControlTree AS (
    -- Anchor: Top Level Controls (usually Sections)
    SELECT
        code,
        parent_control_code,
        form_code,
        type,
        [key],
        label,
        sort_order,
        0 AS Level,
        CAST(RIGHT('0000' + CAST(sort_order AS VARCHAR(10)), 4) AS VARCHAR(MAX)) AS PathOrder
    FROM dbo.control
    WHERE form_code = 'EMP_REG_001' AND parent_control_code IS NULL

    UNION ALL

    -- Recursive: Children
    SELECT
        c.code,
        c.parent_control_code,
        c.form_code,
        c.type,
        c.[key],
        c.label,
        c.sort_order,
        ct.Level + 1,
        CAST(ct.PathOrder + '/' + RIGHT('0000' + CAST(c.sort_order AS VARCHAR(10)), 4) AS VARCHAR(MAX))
    FROM dbo.control c
    INNER JOIN ControlTree ct ON c.parent_control_code = ct.code
)
SELECT * FROM ControlTree
ORDER BY PathOrder;
*/

