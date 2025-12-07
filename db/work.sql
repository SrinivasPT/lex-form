/*
SELECT * FROM dbo.control_group WHERE control_code IN ('employee_dependent.table', 'employee_dependents_section')
SELECT * FROM dbo.control_group WHERE control_code = 'address.group'
SELECT * FROM dbo.control WHERE code = 'employee_dependents_section'
SELECT * FROM dbo.control WHERE code = 'employee_dependent.table'
*/

-- Create recursive function to get control children
CREATE OR ALTER FUNCTION dbo.fn_GetControlChildren(@parentCode NVARCHAR(128))
RETURNS NVARCHAR(MAX)
AS
BEGIN
    DECLARE @json NVARCHAR(MAX)
    
    SELECT @json = (
        SELECT
            c.code,
            c.[key],
            c.type,
            c.label,
            c.placeholder,
            c.help_text AS helpText,
            c.is_required AS required,
            c.is_readonly AS readonly,
            c.min_val AS min,
            c.max_val AS max,
            c.min_length AS minLength,
            c.max_length AS maxLength,
            c.pattern,
            c.category_code AS categoryCode,
            c.dependent_on AS dependentOn,
            c.visible_when AS visibleWhen,
            c.disabled_when AS disabledWhen,
            c.required_when AS requiredWhen,
            c.properties_json AS properties,
            c.layout_config AS width,
            JSON_QUERY(
                CASE 
                    WHEN c.type IN ('GROUP', 'TABLE') THEN dbo.fn_GetControlChildren(c.code)
                    ELSE NULL
                END
            ) AS controls
        FROM dbo.control c
        INNER JOIN dbo.control_group cg ON cg.control_code = @parentCode AND cg.child_control_code = c.code
        ORDER BY cg.sort_order
        FOR JSON PATH
    )
    
    RETURN @json
END
GO

-- Recursive CTE to build nested control hierarchy
GO

SELECT
    f.code,
    f.version,
    f.label,
    JSON_QUERY((
        SELECT
            c.label,
            c.[key],
            c.[type],
            c.layout_config AS width,
            JSON_QUERY(dbo.fn_GetControlChildren(c.code)) AS controls
        FROM dbo.control c
        WHERE c.form_code = f.code
            AND c.parent_control_code IS NULL
            AND c.atomic_level_code = 'SECTION'
        ORDER BY c.sort_order
        FOR JSON PATH
    )) AS sections
FROM dbo.form f
WHERE f.code = 'employee_form'
FOR JSON PATH, WITHOUT_ARRAY_WRAPPER