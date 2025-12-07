-- =============================================
-- CONTROL HIERARCHY QUERIES
-- For building tree structures from form controls
-- =============================================

-- Query to get control hierarchy for a specific form
-- Returns JSON structure suitable for tree controls
DECLARE @formCode VARCHAR(128) = 'EMPLOYEE_FORM';

-- Method 1: Recursive CTE for full hierarchy with levels
WITH ControlHierarchy AS (
    -- Root level controls (no parent in control_group)
    SELECT
        c.code,
        COALESCE(c.label, c.[key], c.code) AS displayText,
        c.type,
        c.[key],
        c.sort_order,
        CAST(NULL AS VARCHAR(128)) AS parentCode,
        0 AS level,
        CAST(c.code AS VARCHAR(MAX)) AS path
    FROM dbo.control c
    WHERE c.form_code = @formCode
    AND NOT EXISTS (
        SELECT 1 FROM dbo.control_group cg
        WHERE cg.child_control_code = c.code
    )

    UNION ALL

    -- Child controls with their parents
    SELECT
        c.code,
        COALESCE(c.label, c.[key], c.code) AS displayText,
        c.type,
        c.[key],
        c.sort_order,
        cg.control_code AS parentCode,
        ch.level + 1 AS level,
        CAST(ch.path + '/' + c.code AS VARCHAR(MAX)) AS path
    FROM dbo.control c
    INNER JOIN dbo.control_group cg ON c.code = cg.child_control_code
    INNER JOIN ControlHierarchy ch ON cg.control_code = ch.code
    WHERE c.form_code = @formCode
)
SELECT
    code,
    displayText,
    type,
    [key] AS controlKey,
    parentCode,
    level,
    path,
    sort_order
FROM ControlHierarchy
ORDER BY path, sort_order
FOR JSON PATH;

-- Method 2: Simple query for tree control (minimal fields)
-- This is the recommended format for the tree control component
SELECT
    c.code,
    COALESCE(c.label, c.[key], c.code) AS displayText,
    cg.control_code AS parentCode,
    c.sort_order
FROM dbo.control c
LEFT JOIN dbo.control_group cg ON c.code = cg.child_control_code
WHERE c.form_code = @formCode
ORDER BY c.sort_order
FOR JSON PATH;

-- Method 3: Get all controls with their hierarchy info (for debugging)
SELECT
    c.code,
    c.form_code,
    c.type,
    c.[key],
    c.label,
    c.parent_control_code,
    cg.control_code AS group_parent,
    cg.child_control_code AS group_child,
    c.sort_order,
    c.atomic_level_code
FROM dbo.control c
LEFT JOIN dbo.control_group cg ON c.code = cg.child_control_code
WHERE c.form_code = @formCode
ORDER BY c.sort_order;

-- Method 4: Get control tree by specific root control
-- Useful when you want to show hierarchy starting from a specific section/group
DECLARE @rootControlCode VARCHAR(128) = 'employee_personal_section';

WITH ControlTree AS (
    -- Start with the root control
    SELECT
        c.code,
        COALESCE(c.label, c.[key], c.code) AS displayText,
        CAST(NULL AS VARCHAR(128)) AS parentCode,
        0 AS level,
        CAST(c.code AS VARCHAR(MAX)) AS path
    FROM dbo.control c
    WHERE c.code = @rootControlCode

    UNION ALL

    -- Add children recursively
    SELECT
        c.code,
        COALESCE(c.label, c.[key], c.code) AS displayText,
        ct.code AS parentCode,
        ct.level + 1 AS level,
        CAST(ct.path + '/' + c.code AS VARCHAR(MAX)) AS path
    FROM dbo.control c
    INNER JOIN dbo.control_group cg ON c.code = cg.child_control_code
    INNER JOIN ControlTree ct ON cg.control_code = ct.code
)
SELECT
    code,
    displayText,
    parentCode,
    level,
    path
FROM ControlTree
ORDER BY path
FOR JSON PATH;