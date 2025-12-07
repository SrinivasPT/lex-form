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
            IF @capitalizeNext = 1
                SET @result = @result + UPPER(@char)
            ELSE
                SET @result = @result + LOWER(@char)
            SET @capitalizeNext = 0
        END
        SET @i = @i + 1
    END
    -- Convert first character to lowercase for camelCase
    IF LEN(@result) > 0
        SET @result = LOWER(SUBSTRING(@result, 1, 1)) + SUBSTRING(@result, 2, LEN(@result) - 1)
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
    category_code,
    sort_order,
    width,
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
        WHEN COLUMN_NAME LIKE '%_code' THEN 'SELECT'
        WHEN DATA_TYPE = 'bit' THEN 'CHECKBOX'
        WHEN DATA_TYPE LIKE '%int%' THEN 'NUMBER'
        WHEN DATA_TYPE LIKE '%date%' THEN 'DATE'
        ELSE 'TEXT'
    END AS type,
    dbo.ToCamelCase(COLUMN_NAME) AS [key],
    dbo.ToProperCase(COLUMN_NAME) AS label,
    CASE 
        WHEN COLUMN_NAME LIKE '%_code' THEN UPPER(COLUMN_NAME)
        ELSE NULL
    END AS category_code,
    ROW_NUMBER() OVER (PARTITION BY TABLE_NAME ORDER BY ORDINAL_POSITION) AS sort_order,
    CASE 
        WHEN DATA_TYPE IN ('nvarchar', 'varchar') AND CHARACTER_MAXIMUM_LENGTH = -1 THEN '[12]'
        WHEN DATA_TYPE IN ('nvarchar', 'varchar') AND CHARACTER_MAXIMUM_LENGTH > 100 THEN '[12]'
        WHEN DATA_TYPE IN ('nvarchar', 'varchar') AND CHARACTER_MAXIMUM_LENGTH > 50 THEN '[6]'
        ELSE '[4]'
    END AS width,
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



