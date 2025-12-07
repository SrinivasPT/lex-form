/*
- For all the tables, generate a table control in control table
- Table name for this table control will be <table_name>Table. Column name will be null
- all the controls of that table insert into control_group table
*/

USE lex_form_db
GO

-- DELETE FROM dbo.control WHERE atomic_level_code = 'COMPOSITE';

-- Insert table controls into control table using INFORMATION_SCHEMA
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
    source_column
)
SELECT DISTINCT
    t.TABLE_NAME + '.table' AS code,
    NULL AS form_code,
    NULL AS parent_control_code,
    'COMPOSITE' AS atomic_level_code,
    'TABLE' AS type,
    dbo.ToCamelCase(t.TABLE_NAME) AS [key],
    dbo.ToProperCase(t.TABLE_NAME) AS label,
    ROW_NUMBER() OVER (ORDER BY t.TABLE_NAME) AS sort_order,
    '[12]' AS layout_config,
    t.TABLE_NAME AS source_table,
    NULL AS source_column
FROM INFORMATION_SCHEMA.TABLES t 
WHERE t.TABLE_SCHEMA = 'dbo'
AND TABLE_NAME NOT LIKE '%history%';

GO
