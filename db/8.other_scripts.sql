USE lex_form_db
GO

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
            c.width AS width,
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