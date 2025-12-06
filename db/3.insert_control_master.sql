/*
Generate the insert statements for control master data
- Treat each column of the table in schema.sql as a field to be inserted
- table_name, column_name, column_data_type are as per schema.sql
- code is a unique identifier for each control and it will be formed as <table_name>.<column_name>
- key will be column name converted to camelCase
- label - come up with a human friendly label for each control based on column name
- width - If the column is going to hold large text date, set to 12, if text is medium set to 6, else set to 4. Sample values [12, 6, 4] where 12 will be on mobiile
- sort_order - assign a sort order starting from 1 for each control in the order they appear in schema.sql
- Insert statements should be in the order of appearance in schema.sql
- Based on the not null constraints in schema.sql, set required field accordingly
- If the column_data_type is VARCHAR with specific size, add the maxLength. If the VARCHAR field is required, then add minLength as 2
*/

USE lex_form_db
GO

-- Function to convert snake_case to camelCase
CREATE OR ALTER FUNCTION dbo.ToCamelCase(@str VARCHAR(128))
RETURNS VARCHAR(128)
AS
BEGIN
    DECLARE @result VARCHAR(128) = ''
    DECLARE @i INT = 1
    DECLARE @len INT = LEN(@str)
    DECLARE @capitalizeNext BIT = 0

    WHILE @i <= @len
    BEGIN
        DECLARE @char CHAR(1) = SUBSTRING(@str, @i, 1)
        IF @char = '_'
        BEGIN
            SET @capitalizeNext = 1
        END
        ELSE
        BEGIN
            IF @i = 1 OR @capitalizeNext = 1
                SET @result = @result + UPPER(@char)
            ELSE
                SET @result = @result + LOWER(@char)
            SET @capitalizeNext = 0
        END
        SET @i = @i + 1
    END
    RETURN @result
END
GO

-- Function to convert snake_case to Proper Case (Title Case)
CREATE OR ALTER FUNCTION dbo.ToProperCase(@str VARCHAR(128))
RETURNS VARCHAR(128)
AS
BEGIN
    DECLARE @result VARCHAR(128) = ''
    DECLARE @i INT = 1
    DECLARE @len INT = LEN(@str)
    DECLARE @capitalizeNext BIT = 1  -- Start with capitalize

    WHILE @i <= @len
    BEGIN
        DECLARE @char CHAR(1) = SUBSTRING(@str, @i, 1)
        IF @char = '_'
        BEGIN
            SET @result = @result + ' '
            SET @capitalizeNext = 1
        END
        ELSE
        BEGIN
            IF @capitalizeNext = 1
                SET @result = @result + UPPER(@char)
            ELSE
                SET @result = @result + LOWER(@char)
            SET @capitalizeNext = 0
        END
        SET @i = @i + 1
    END
    RETURN @result
END
GO

DELETE FROM dbo.control;

-- Insert controls using INFORMATION_SCHEMA
INSERT INTO dbo.control (
    code,
    form_code,
    parent_control_code,
    atomic_level_code,
    type,
    [key],
    label,
    sort_order,
    layout_config,
    source_table,
    source_column,
    source_data_type,
    is_required,
    min_length,
    max_length
)
SELECT
    TABLE_NAME + '.' + COLUMN_NAME AS code,
    NULL AS form_code,
    NULL AS parent_control_code,
    'BASE' AS atomic_level_code,
    CASE 
        WHEN DATA_TYPE = 'bit' THEN 'CHECKBOX'
        WHEN DATA_TYPE LIKE '%int%' THEN 'NUMBER'
        WHEN DATA_TYPE LIKE '%date%' THEN 'DATE'
        ELSE 'TEXT'
    END AS type,
    dbo.ToCamelCase(COLUMN_NAME) AS [key],
    dbo.ToProperCase(COLUMN_NAME) AS label,
    ROW_NUMBER() OVER (PARTITION BY TABLE_NAME ORDER BY ORDINAL_POSITION) AS sort_order,
    CASE 
        WHEN DATA_TYPE IN ('nvarchar', 'varchar') AND CHARACTER_MAXIMUM_LENGTH = -1 THEN '[12]'
        WHEN DATA_TYPE IN ('nvarchar', 'varchar') AND CHARACTER_MAXIMUM_LENGTH > 100 THEN '[12]'
        WHEN DATA_TYPE IN ('nvarchar', 'varchar') AND CHARACTER_MAXIMUM_LENGTH > 50 THEN '[6]'
        ELSE '[4]'
    END AS layout_config,
    TABLE_NAME AS source_table,
    COLUMN_NAME AS source_column,
    DATA_TYPE AS source_data_type,
    CASE WHEN IS_NULLABLE = 'NO' THEN 1 ELSE 0 END AS is_required,
    CASE WHEN DATA_TYPE IN ('varchar', 'nvarchar') AND IS_NULLABLE = 'NO' THEN 2 ELSE NULL END AS min_length,
    CASE WHEN DATA_TYPE IN ('varchar', 'nvarchar') THEN CHARACTER_MAXIMUM_LENGTH ELSE NULL END AS max_length
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'dbo' 
    AND TABLE_NAME NOT LIKE '%history%'
ORDER BY TABLE_NAME, ORDINAL_POSITION;

GO



