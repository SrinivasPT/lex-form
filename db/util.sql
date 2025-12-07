/*
    Utility stored procedures for SQL Server temporal table handling
    - Provides safe operations to detach history tables, drop system-versioned tables,
      and helper functions for dropping indexes or tables if they exist.

    Conventions:
    - Use dbo schema by default
    - Procedures are idempotent (drop if exists) and safe to re-run
*/

USE lex_form_db
GO

-- Drop helper (if exists)
IF OBJECT_ID('dbo.sp_disable_system_versioning', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_disable_system_versioning;
GO
CREATE PROCEDURE dbo.sp_disable_system_versioning
    @schema_name SYSNAME = 'dbo',
    @table_name SYSNAME
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @objid INT = OBJECT_ID(@schema_name + '.' + @table_name);
    IF @objid IS NULL
        RETURN;

    DECLARE @temporal_type INT = (SELECT temporal_type FROM sys.tables WHERE object_id = @objid);
    IF @temporal_type = 2
    BEGIN
        DECLARE @sql NVARCHAR(MAX) = N'ALTER TABLE ' + QUOTENAME(@schema_name) + '.' + QUOTENAME(@table_name) + ' SET (SYSTEM_VERSIONING = OFF);';
        EXEC sp_executesql @sql;
    END
END;
GO

-- Procedure: Detach history by history table name
IF OBJECT_ID('dbo.sp_detach_history_by_history_table', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_detach_history_by_history_table;
GO
CREATE PROCEDURE dbo.sp_detach_history_by_history_table
    @history_schema SYSNAME = 'dbo',
    @history_table SYSNAME
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @history_objid INT = OBJECT_ID(@history_schema + '.' + @history_table);
    IF @history_objid IS NULL
        RETURN;

    DECLARE @base_objid INT = (SELECT object_id FROM sys.tables WHERE history_table_id = @history_objid);
    IF @base_objid IS NULL
        RETURN;

    DECLARE @base_schema SYSNAME = OBJECT_SCHEMA_NAME(@base_objid);
    DECLARE @base_table SYSNAME = OBJECT_NAME(@base_objid);
    DECLARE @sql NVARCHAR(MAX) = N'ALTER TABLE ' + QUOTENAME(@base_schema) + '.' + QUOTENAME(@base_table) + ' SET (SYSTEM_VERSIONING = OFF);';
    EXEC sp_executesql @sql;
END;
GO

-- Procedure: Drop a temporal table safely (disable system versioning, drop history then drop base)
IF OBJECT_ID('dbo.sp_drop_temporal_table', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_drop_temporal_table;
GO
CREATE PROCEDURE dbo.sp_drop_temporal_table
    @schema_name SYSNAME = 'dbo',
    @base_table_name SYSNAME
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @full_name NVARCHAR(256) = @schema_name + '.' + @base_table_name;
    DECLARE @base_objid INT = OBJECT_ID(@full_name);
    IF @base_objid IS NULL
    BEGIN
        RETURN; -- nothing to do
    END

    -- If base is temporal, find history table and detach
    DECLARE @temporal_type INT = (SELECT temporal_type FROM sys.tables WHERE object_id = @base_objid);
    IF @temporal_type = 2
    BEGIN
        DECLARE @history_table_id INT = (SELECT history_table_id FROM sys.tables WHERE object_id = @base_objid);
        IF @history_table_id IS NOT NULL
        BEGIN
            DECLARE @history_schema SYSNAME = OBJECT_SCHEMA_NAME(@history_table_id);
            DECLARE @history_table SYSNAME = OBJECT_NAME(@history_table_id);
            DECLARE @drop_hist_sql NVARCHAR(MAX) = N'DROP TABLE ' + QUOTENAME(@history_schema) + '.' + QUOTENAME(@history_table) + ';';

            -- Disable system versioning on base
            EXEC sp_disable_system_versioning @schema_name, @base_table_name;

            -- Drop history table if exists
            IF OBJECT_ID(@history_schema + '.' + @history_table, 'U') IS NOT NULL
            BEGIN
                EXEC sp_executesql @drop_hist_sql;
            END
        END
    END

    -- Finally drop base table
    DECLARE @drop_sql NVARCHAR(MAX) = N'DROP TABLE ' + QUOTENAME(@schema_name) + '.' + QUOTENAME(@base_table_name) + ';';
    EXEC sp_executesql @drop_sql;
END;
GO

-- Procedure: Drop index if exists
IF OBJECT_ID('dbo.sp_drop_index_if_exists', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_drop_index_if_exists;
GO
CREATE PROCEDURE dbo.sp_drop_index_if_exists
    @schema_name SYSNAME = 'dbo',
    @table_name SYSNAME,
    @index_name SYSNAME
AS
BEGIN
    SET NOCOUNT ON;
    IF OBJECT_ID(@schema_name + '.' + @table_name, 'U') IS NULL
        RETURN;
    IF EXISTS (SELECT 1 FROM sys.indexes WHERE name = @index_name AND object_id = OBJECT_ID(@schema_name + '.' + @table_name))
    BEGIN
        DECLARE @sql NVARCHAR(MAX) = N'DROP INDEX ' + QUOTENAME(@index_name) + ' ON ' + QUOTENAME(@schema_name) + '.' + QUOTENAME(@table_name) + ';';
        EXEC sp_executesql @sql;
    END
END;
GO

-- Procedure: Safe drop table - checks for temporal and uses sp_drop_temporal_table if needed
IF OBJECT_ID('dbo.sp_safe_drop_table', 'P') IS NOT NULL
    DROP PROCEDURE dbo.sp_safe_drop_table;
GO
CREATE PROCEDURE dbo.sp_safe_drop_table
    @schema_name SYSNAME = 'dbo',
    @table_name SYSNAME
AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @full_name NVARCHAR(256) = @schema_name + '.' + @table_name;
    DECLARE @objid INT = OBJECT_ID(@full_name);
    IF @objid IS NULL
        RETURN;

    DECLARE @temporal_type INT = (SELECT temporal_type FROM sys.tables WHERE object_id = @objid);
    IF @temporal_type = 2
    BEGIN
        EXEC dbo.sp_drop_temporal_table @schema_name, @table_name;
        RETURN;
    END

    DECLARE @sql NVARCHAR(MAX) = N'DROP TABLE ' + QUOTENAME(@schema_name) + '.' + QUOTENAME(@table_name) + ';';
    EXEC sp_executesql @sql;
END;
GO

/* Example usage:
-- Disable system versioning on a table
EXEC dbo.sp_disable_system_versioning 'dbo', 'employees';

-- Drop a history table safely
EXEC dbo.sp_detach_history_by_history_table 'dbo', 'employees_history';

-- Drop a temporal table (base + history)
EXEC dbo.sp_drop_temporal_table 'dbo', 'employees';

-- Drop an index if exists
EXEC dbo.sp_drop_index_if_exists 'dbo', 'employees', 'idx_employees_email';

-- Safe drop
EXEC dbo.sp_safe_drop_table 'dbo', 'employees';
*/
