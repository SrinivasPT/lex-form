/*
    Database: Microsoft SQL Server
    Context: LexForm Employee Data
    Architecture: Normalized relational schema for employee information
        - employee: Main employee table
        - employee_address: Address table (supports multiple per employee)
        - employee_dependent: Dependent table (supports multiple per employee)

    Naming Conventions:
    - Use snake_case for naming conventions.
    - Use singular nouns for table names.
    - Use lowercase for all identifiers.
    - Prefix foreign key columns with the referenced table name.

    Note: This script assumes utility stored procedures in `db/util.sql` (e.g., sp_safe_drop_table,
    sp_drop_index_if_exists) are already installed in the database. The migration/cleanup
    at the top will attempt to drop legacy plural tables (temporary) before creating the new
    singular named tables.
*/

USE lex_form_db
GO

-- =============================================
-- MIGRATION CLEANUP (TEMP): Drop legacy plural-named tables if present
-- =============================================
PRINT '-- Migration: dropping legacy plural-named tables using util stored procedures';
EXEC dbo.sp_safe_drop_table 'dbo', 'employee_dependents';
EXEC dbo.sp_safe_drop_table 'dbo', 'employee_addresses';
EXEC dbo.sp_safe_drop_table 'dbo', 'employees';
GO

-- =============================================
-- Cleanup: drop singular tables if exist (safe)
-- =============================================
PRINT '-- Cleanup: drop singular-named tables using util stored procedures';
EXEC dbo.sp_safe_drop_table 'dbo', 'employee_dependent';
EXEC dbo.sp_safe_drop_table 'dbo', 'employee_address';
EXEC dbo.sp_safe_drop_table 'dbo', 'employee';
GO
-- =============================================
-- 2. EMPLOYEE TABLE
-- =============================================
IF OBJECT_ID('dbo.employee', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.employee (
        id NVARCHAR(50) PRIMARY KEY,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        nick_name NVARCHAR(100),
        email NVARCHAR(255) UNIQUE NOT NULL,
        date_of_birth DATE,
        is_married BIT DEFAULT 0,
        age INT,
        about NVARCHAR(MAX),
        nationality NVARCHAR(10),
        has_nick_name BIT DEFAULT 0,

        -- System Versioning
        guid UNIQUEIDENTIFIER DEFAULT NEWID(),
        sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
        sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
        PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time)
    )
    WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.employee_history));
END
GO

-- =============================================
-- 3. EMPLOYEE ADDRESS TABLE
-- =============================================
IF OBJECT_ID('dbo.employee_address', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.employee_address (
        id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id NVARCHAR(50) NOT NULL,
        street NVARCHAR(255),
        city NVARCHAR(100),
        country_code NVARCHAR(10),
        state_code NVARCHAR(10),

        -- System Versioning
        guid UNIQUEIDENTIFIER DEFAULT NEWID(),
        sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
        sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
        PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

        CONSTRAINT fk_employee_address_employee FOREIGN KEY (employee_id) REFERENCES dbo.employee(id)
    )
    WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.employee_address_history));
END
GO

-- =============================================
-- 4. EMPLOYEE DEPENDENT TABLE
-- =============================================
IF OBJECT_ID('dbo.employee_dependent', 'U') IS NULL
BEGIN
    CREATE TABLE dbo.employee_dependent (
        id INT IDENTITY(1,1) PRIMARY KEY,
        employee_id NVARCHAR(50) NOT NULL,
        dep_id NVARCHAR(50) NOT NULL,
        first_name NVARCHAR(100) NOT NULL,
        last_name NVARCHAR(100) NOT NULL,
        relation NVARCHAR(50),
        age INT,

        -- System Versioning
        guid UNIQUEIDENTIFIER DEFAULT NEWID(),
        sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START HIDDEN NOT NULL,
        sys_end_time   DATETIME2(7) GENERATED ALWAYS AS ROW END HIDDEN NOT NULL,
        PERIOD FOR SYSTEM_TIME (sys_start_time, sys_end_time),

        CONSTRAINT fk_employee_dependent_employee FOREIGN KEY (employee_id) REFERENCES dbo.employee(id)
    )
    WITH (SYSTEM_VERSIONING = ON (HISTORY_TABLE = dbo.employee_dependent_history));
END
GO

-- =============================================
-- 5. INDEXES
-- =============================================

-- Employee index
EXEC dbo.sp_drop_index_if_exists 'dbo', 'employee', 'idx_employee_email';
IF OBJECT_ID('dbo.employee', 'U') IS NOT NULL
BEGIN
    CREATE INDEX idx_employee_email ON dbo.employee(email);
END

-- Employee address index
EXEC dbo.sp_drop_index_if_exists 'dbo', 'employee_address', 'idx_employee_address_employee_id';
IF OBJECT_ID('dbo.employee_address', 'U') IS NOT NULL
BEGIN
    CREATE INDEX idx_employee_address_employee_id ON dbo.employee_address(employee_id);
END

-- Employee dependent index
EXEC dbo.sp_drop_index_if_exists 'dbo', 'employee_dependent', 'idx_employee_dependent_employee_id';
IF OBJECT_ID('dbo.employee_dependent', 'U') IS NOT NULL
BEGIN
    CREATE INDEX idx_employee_dependent_employee_id ON dbo.employee_dependent(employee_id);
END
GO
