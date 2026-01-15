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
            c.atomic_level_code AS atomicLevelCode,
            c.type,
            c.[key],
            c.label,
            c.placeholder,
            c.help_text AS helpText,
            c.sort_order AS sortOrder,
            cg.data_path AS dataPath,
            COALESCE(cg.width, c.width) AS width,
            c.source_table AS sourceTable,
            c.source_column AS sourceColumn,
            c.source_data_type AS sourceDataType,
            c.category_code AS categoryCode,
            c.dependent_on AS dependentOn,
            COALESCE(cg.visible_when, c.visible_when) AS visibleWhen,
            COALESCE(cg.disabled_when, c.disabled_when) AS disabledWhen,
            COALESCE(cg.required_when, c.required_when) AS requiredWhen,
            COALESCE(cg.is_readonly, c.is_readonly) AS readonly,
            COALESCE(cg.is_required, c.is_required) AS required,
            cg.additional_settings AS additionalSettings,
            c.min_val AS min,
            c.max_val AS max,
            c.min_length AS minLength,
            c.max_length AS maxLength,
            c.pattern,
            c.guid,
            c.sys_start_time AS sysStartTime,
            c.sys_end_time AS sysEndTime,
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