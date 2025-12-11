-- Query to get control hierarchy starting from employee_section
DECLARE @rootControl VARCHAR(128) = 'employee_section';

WITH ControlHierarchy AS (
    -- Start with the root control
    SELECT
        c.code,
        COALESCE(c.label, c.[key], c.code) + ' (' + c.type + ')' AS displayText,
        c.type,
        c.[key],
        c.sort_order,
        CAST(NULL AS VARCHAR(128)) AS parentCode,
        0 AS level,
        CAST(c.code AS VARCHAR(MAX)) AS path
    FROM dbo.control c
    WHERE c.code = @rootControl

    UNION ALL

    -- Child controls with their parents (from control_group)
    SELECT
        c.code,
        COALESCE(c.label, c.[key], c.code) + ' (' + c.type + ')' AS displayText,
        c.type,
        c.[key],
        c.sort_order,
        cg.control_code AS parentCode,
        ch.level + 1 AS level,
        CAST(ch.path + '/' + c.code AS VARCHAR(MAX)) AS path
    FROM dbo.control c
    INNER JOIN dbo.control_group cg ON c.code = cg.child_control_code
    INNER JOIN ControlHierarchy ch ON cg.control_code = ch.code
)
SELECT
    code,
    displayText,
    type,
    [key],
    parentCode,
    level,
    path,
    sort_order
FROM ControlHierarchy
ORDER BY path, sort_order
FOR JSON PATH;