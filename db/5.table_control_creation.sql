-- Insert control_group relationships using INFORMATION_SCHEMA
USE lex_form_db
GO

INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
SELECT 
    t.TABLE_NAME + '.table' AS control_code,
    t.TABLE_NAME + '.' + c.COLUMN_NAME AS child_control_code,
    ROW_NUMBER() OVER (PARTITION BY t.TABLE_NAME ORDER BY c.ORDINAL_POSITION) AS sort_order
FROM INFORMATION_SCHEMA.TABLES t 
    JOIN INFORMATION_SCHEMA.COLUMNS c ON c.TABLE_NAME = t.TABLE_NAME 
        AND c.TABLE_SCHEMA = 'dbo'
        AND t.TABLE_NAME NOT LIKE '%history%'
ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION;

GO