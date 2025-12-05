/*
    Database: Microsoft SQL Server
    
    Naming Conventions:
    - Use snake_case for naming conventions.
    - Use singular nouns for table names.
    - Use lowercase for all identifiers.
    - Prefix foreign key columns with the referenced table name.

*/

USE lex_form_db
GO

ALTER TABLE dbo.section_control_mapping SET (SYSTEM_VERSIONING = OFF);
ALTER TABLE dbo.section_mapping SET (SYSTEM_VERSIONING = OFF);
ALTER TABLE dbo.section SET (SYSTEM_VERSIONING = OFF);
ALTER TABLE dbo.control SET (SYSTEM_VERSIONING = OFF);
ALTER TABLE dbo.form SET (SYSTEM_VERSIONING = OFF);

DROP TABLE IF EXISTS dbo.section_control_mapping;
DROP TABLE IF EXISTS dbo.section_mapping;
DROP TABLE IF EXISTS dbo.section;
DROP TABLE IF EXISTS dbo.control;
DROP TABLE IF EXISTS dbo.form;
DROP TABLE IF EXISTS dbo.domain_data;
GO

CREATE TABLE dbo.domain_data (
    category_code VARCHAR(128),
    code VARCHAR(255) NOT NULL,
    display_text VARCHAR(255) NOT NULL,
    parent_code VARCHAR(255),
    sort_order INT,

    -- System Fields
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time  DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN,
    sys_end_time    DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

    -- Primary Key        
    PRIMARY KEY (category_code, code)
)
GO


CREATE TABLE dbo.form (
    code VARCHAR(128) PRIMARY KEY,
    version VARCHAR(32) NOT NULL,
    label VARCHAR(255) NOT NULL,

    -- System Fields
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time  DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN,
    sys_end_time    DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),
)
GO

ALTER TABLE form SET (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.form_history));
GO

CREATE TABLE dbo.section (
    code VARCHAR(128) PRIMARY KEY,
    form_code VARCHAR(128) NOT NULL,
    label VARCHAR(255),
    [key] VARCHAR(128),
    width VARCHAR(MAX),

    -- System Fields
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time  DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN,
    sys_end_time    DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

    -- Foreign Key
    FOREIGN KEY (form_code) REFERENCES form(code)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.section_history));
GO

CREATE TABLE dbo.section_mapping (
    form_code VARCHAR(128) NOT NULL,
    section_code VARCHAR(128) NOT NULL,
    sort_order INT,

    -- System Fields
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time  DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN,
    sys_end_time    DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

    -- Primary Key and Foreign Keys
    PRIMARY KEY (form_code, section_code),
    FOREIGN KEY (form_code) REFERENCES form(code),
    FOREIGN KEY (section_code) REFERENCES section(code)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.section_mapping_history));
GO

CREATE TABLE dbo.control (
    code VARCHAR(128) PRIMARY KEY,
    table_name VARCHAR(128) NOT NULL,
    column_name VARCHAR(128) NOT NULL,
    column_data_type VARCHAR(64) NOT NULL,
    [key] VARCHAR(128) NOT NULL,
    type VARCHAR(32),
    label VARCHAR(255),
    placeholder VARCHAR(255),
    width VARCHAR(MAX),
    options VARCHAR(MAX),

    -- Domain / Data Source fields
    category_code VARCHAR(128),
    dependent_on VARCHAR(128),

    -- Logic Expressions (Safe Strings)
    visible_when VARCHAR(MAX),
    disabled_when VARCHAR(MAX),
    required_when VARCHAR(MAX),

    -- Validators
    required BIT DEFAULT 0,
    min INT,
    max INT,
    min_length INT,
    max_length INT,
    pattern VARCHAR(255),
    email BIT DEFAULT 0,
    required_true BIT DEFAULT 0,

    row_config VARCHAR(MAX),

    -- Table-specific fields
    pagination VARCHAR(MAX),
    searchable BIT,
    sortable BIT,
    row_actions VARCHAR(MAX),
    header_actions VARCHAR(MAX),
    max_inline_actions INT,
    add_label VARCHAR(255),
    mobile_behavior VARCHAR(32),

    -- System Fields
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time  DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN,
    sys_end_time    DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.control_history));
GO



CREATE TABLE dbo.section_control_mapping (
    section_code VARCHAR(128) NOT NULL,
    control_code VARCHAR(128) NOT NULL,
    sort_order INT,

    -- System Fields
    guid UNIQUEIDENTIFIER DEFAULT NEWID(),
    sys_start_time  DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN,
    sys_end_time    DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN,
    PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

    -- Primary Key and Foreign Keys
    PRIMARY KEY (section_code, control_code),
    FOREIGN KEY (section_code) REFERENCES section(code),
    FOREIGN KEY (control_code) REFERENCES control(code)
)
WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.section_control_mapping_history));

-- Indexes for performance
CREATE INDEX idx_section_form_code ON section(form_code);
CREATE INDEX idx_control_category_code ON control(category_code);
CREATE INDEX idx_section_mapping_form_code ON section_mapping(form_code);
CREATE INDEX idx_section_control_mapping_section_code ON section_control_mapping(section_code);
CREATE INDEX idx_section_control_mapping_control_code ON section_control_mapping(control_code);
CREATE INDEX idx_control_table_name ON control(table_name);
CREATE INDEX idx_control_key ON control([key]);

-- Constraints
ALTER TABLE section_mapping ADD CONSTRAINT chk_section_mapping_sort_order CHECK (sort_order >= 0);
ALTER TABLE section_control_mapping ADD CONSTRAINT chk_section_control_mapping_sort_order CHECK (sort_order >= 0);
ALTER TABLE domain_data ADD CONSTRAINT chk_domain_data_sort_order CHECK (sort_order >= 0);

-- Validators logic check constraints
ALTER TABLE control ADD CONSTRAINT chk_control_min_max CHECK (min IS NULL OR max IS NULL OR min <= max);
ALTER TABLE control ADD CONSTRAINT chk_control_minlength_maxlength CHECK (min_length IS NULL OR max_length IS NULL OR min_length <= max_length);

