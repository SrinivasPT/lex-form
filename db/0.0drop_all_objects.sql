USE lex_form_db
GO

-- Drop all foreign key constraints
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'ALTER TABLE ' + QUOTENAME(OBJECT_SCHEMA_NAME(parent_object_id)) + '.' + QUOTENAME(OBJECT_NAME(parent_object_id)) + ' DROP CONSTRAINT ' + QUOTENAME(name) + '; '
FROM sys.foreign_keys
WHERE is_ms_shipped = 0;
IF LEN(@sql) > 0
    EXEC sp_executesql @sql;
GO

-- Drop all user-defined tables (including temporal tables)
DECLARE table_cursor CURSOR FOR
SELECT SCHEMA_NAME(schema_id), name
FROM sys.tables
WHERE type = 'U' AND is_ms_shipped = 0;
OPEN table_cursor;
DECLARE @schema SYSNAME, @table SYSNAME;
FETCH NEXT FROM table_cursor INTO @schema, @table;
WHILE @@FETCH_STATUS = 0
BEGIN
    EXEC dbo.sp_safe_drop_table @schema, @table;
    FETCH NEXT FROM table_cursor INTO @schema, @table;
END
CLOSE table_cursor;
DEALLOCATE table_cursor;
GO

-- Drop all user-defined functions
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'DROP FUNCTION ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + '; '
FROM sys.objects
WHERE type IN ('FN', 'IF', 'TF') AND is_ms_shipped = 0;
IF LEN(@sql) > 0
    EXEC sp_executesql @sql;
GO

-- Drop all user-defined procedures
DECLARE @sql NVARCHAR(MAX) = '';
SELECT @sql = @sql + 'DROP PROCEDURE ' + QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name) + '; '
FROM sys.procedures
WHERE type = 'P' AND is_ms_shipped = 0;
IF LEN(@sql) > 0
    EXEC sp_executesql @sql;
GO