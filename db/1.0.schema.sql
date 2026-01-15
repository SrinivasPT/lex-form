USE lex_form_db
GO
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
    
    -- atomic_level_code values of COLUMN and TABLE are directly mapped to database structures. So their structure must align with the underlying DB schema.
    -- atomic_level_code values of VIEW represent computed or derived data structures that may not have a direct database representation but are essential for UI rendering and user interaction.
    atomic_level_code VARCHAR(20) NOT NULL, -- COLUMN, TABLE, VIEW
    
    -- atomic level code = COLUMN can be 'TEXT', 'SELECT', 'DATE', 'CHECKBOX', 'RADIO', 'FILE', 'NUMBER', 
    -- atomic level code IN [TABLE, VIEW] can be 'FORM', 'SECTION', 'TABLE', 'TAB'
    type VARCHAR(32) NOT NULL, 
    [key] VARCHAR(128),        -- Data Binding Key (camelCase)
    label NVARCHAR(255),
    placeholder NVARCHAR(255),
    help_text NVARCHAR(500),   -- Tooltip / Aria description
    sort_order INT NOT NULL DEFAULT 0,

    -- Layout (Responsive Grid)
    -- Storing as JSON is cleaner than columns:  [12, 6, 4] for Mobile, Tablet, Desktop
    width NVARCHAR(MAX), 
    additional_settings NVARCHAR(MAX), -- JSON for complex layouts (e.g., Table columns, Group layouts)

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
    CONSTRAINT chk_additional_settings_json CHECK (ISJSON(additional_settings) = 1),
    CONSTRAINT chk_props_json CHECK (ISJSON(properties_json) = 1),
    CONSTRAINT chk_min_max CHECK (min_val <= max_val),
    CONSTRAINT chk_len_min_max CHECK (min_length <= max_length)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.control_history));

-- =============================================
-- 5. CONTROL RELATIONSHIP (Dependencies & Mappings)
-- =============================================
IF NOT EXISTS (SELECT * FROM sys.objects WHERE object_id = OBJECT_ID(N'dbo.control_group') AND type in (N'U'))
CREATE TABLE dbo.control_group (
    control_code VARCHAR(128) NOT NULL,       -- The control that has the relationship
    child_control_code VARCHAR(128) NOT NULL, -- The control it relates to
    data_path VARCHAR(255) NULL,
    width NVARCHAR(MAX), -- Storing as JSON is cleaner than columns:  [12, 6, 4] for Mobile, Tablet, Desktop

    -- Expressions for dynamic behavior
    visible_when NVARCHAR(MAX),
    disabled_when NVARCHAR(MAX),
    required_when NVARCHAR(MAX),
    is_required BIT DEFAULT 0,
    is_readonly BIT DEFAULT 0,

    sort_order INT DEFAULT 0,
    additional_settings NVARCHAR(MAX), -- JSON for complex layouts (e.g., Table columns, Group layouts)

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

IF OBJECT_ID('dbo.control', 'U') IS NOT NULL
BEGIN
    CREATE INDEX idx_control_form_code ON dbo.control(form_code);
    CREATE INDEX idx_control_parent_code ON dbo.control(parent_control_code);
    CREATE INDEX idx_control_sort_order ON dbo.control(sort_order);
END

-- Domain Lookups
IF OBJECT_ID('dbo.domain_data', 'U') IS NOT NULL
BEGIN
    CREATE INDEX idx_domain_category ON dbo.domain_data(category_code);
END
GO

