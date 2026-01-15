-- -- =============================================================================
-- -- Example: Configure Table Column Visibility & Widths
-- -- =============================================================================
-- -- This script demonstrates how to configure column visibility and widths
-- -- for table controls using control_group.additional_settings
-- -- 
-- -- VISIBILITY LOGIC:
-- -- 1. If visibleColumns is present - show ONLY those columns
-- -- 2. If BOTH visibleColumns AND hiddenColumns - show visibleColumns minus hiddenColumns
-- -- 3. If only hiddenColumns - show all except hiddenColumns
-- -- 4. If neither - show all columns
-- -- =============================================================================

-- USE lex_form_db;
-- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 1: Show Only Specific Columns (visibleColumns)
-- -- Use when you want to explicitly control which columns appear
-- -- -----------------------------------------------------------------------------
-- UPDATE dbo.control_group
-- SET additional_settings = '{
--     "visibleColumns": ["first_name", "last_name", "email", "department"]
-- }'
-- WHERE control_code = 'employee_table';

-- -- Result: Only shows first_name, last_name, email, department
-- -- All other columns (id, ssn, phone, etc.) are hidden

-- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 2: Hide Specific Columns (hiddenColumns)
-- -- Use when it's easier to specify what to hide than what to show
-- -- -----------------------------------------------------------------------------
-- -- UPDATE dbo.control_group
-- -- SET additional_settings = '{
-- --     "hiddenColumns": ["employee_id", "ssn"]
-- -- }'
-- -- WHERE control_code = 'employee_table'
-- --   AND child_control_code IN (
-- --       SELECT code 
-- --       FROM dbo.control 
-- --       WHERE [key] IN ('employee_id', 'ssn')
-- --   );

-- -- -- Verify
-- -- SELECT 
-- --     cg.control_code,
-- --     cg.child_control_code,
-- --     c.[key] AS column_key,
-- --     c.label AS column_label,
-- --     cg.additional_settings
-- -- FROM dbo.control_group cg
-- -- JOIN dbo.control c ON cg.child_control_code = c.code
-- -- WHERE cg.control_code = 'employee_table'
-- -- ORDER BY cg.sort_order;

-- -- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 2: Hide Specific Columns (hiddenColumns)
-- -- Use when it's easier to specify what to hide than what to show
-- -- -----------------------------------------------------------------------------
-- UPDATE dbo.control_group
-- SET additional_settings = '{
--     "hiddenColumns": ["employee_id", "ssn", "internal_notes"]
-- }'
-- WHERE control_code = 'employee_table';

-- -- Result: Shows all columns EXCEPT employee_id, ssn, and internal_notes

-- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 3: Combined Visibility Control (visibleColumns + hiddenColumns)
-- -- Show specific columns but exclude some from that list
-- -- -----------------------------------------------------------------------------
-- UPDATE dbo.control_group
-- SET additional_settings = '{
--     "visibleColumns": ["first_name", "last_name", "email", "phone", "notes"],
--     "hiddenColumns": ["notes"]
-- }'
-- WHERE control_code = 'employee_table';

-- -- Result: Shows first_name, last_name, email, phone
-- -- (notes is excluded even though it's in visibleColumns)

-- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 4: Custom Column Widths with Proportional Distribution
-- -- Give specific widths to name columns, let others auto-calculate
-- -- -----------------------------------------------------------------------------
-- -- UPDATE dbo.control_group
-- -- SET additional_settings = '{
-- --     "columnWidths": {
-- --         "first_name": "25%",
-- --         "last_name": "25%"
-- --     }
-- -- }'
-- -- WHERE control_code = 'employee_table'
-- --   AND child_control_code IN (
-- --       SELECT code 
-- --       FROM dbo.control 
-- --       WHERE [key] IN ('first_name', 'last_name', 'email', 'phone', 'department')
-- --   );

-- -- -- Note: email, phone, department will share the remaining 50% proportionally
-- -- -- based on their control.width values

-- -- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 4: Custom Column Widths with Proportional Distribution
-- -- Give specific widths to name columns, let others auto-calculate
-- -- -----------------------------------------------------------------------------
-- UPDATE dbo.control_group
-- SET additional_settings = '{
--     "columnWidths": {
--         "first_name": "25%",
--         "last_name": "25%"
--     }
-- }'
-- WHERE control_code = 'employee_table';

-- -- Note: email, phone, department will share the remaining 50% proportionally
-- -- based on their control.width values

-- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 5: Complete Configuration - Visible, Hidden, and Widths
-- -- The most comprehensive example combining all features
-- -- -----------------------------------------------------------------------------
-- UPDATE dbo.control_group
-- SET additional_settings = '{
--     "visibleColumns": ["first_name", "last_name", "email", "department", "status"],
--     "hiddenColumns": ["status"],
--     "columnWidths": {
--         "first_name": "25%",
--         "last_name": "25%",
--         "email": "30%"
--     }
-- }'
-- WHERE control_code = 'employee_table';

-- -- Result: 
-- -- - Shows: first_name (25%), last_name (25%), email (30%), department (20% auto)
-- -- - Hidden: status (even though in visibleColumns), and all others not in visibleColumns

-- GO

-- -- -----------------------------------------------------------------------------
-- -- Example 6: Admin Table - Hide Technical Fields
-- -- Useful for admin interfaces where you want to hide internal metadata
-- -- -----------------------------------------------------------------------------
-- UPDATE dbo.control_group
-- SET additional_settings = '{
--     "hiddenColumns": ["guid", "sys_start_time", "sys_end_time"]
-- }'
-- WHERE control_code = 'control_admin_table';

-- GO

-- -- GO

-- -- -- -----------------------------------------------------------------------------
-- -- -- Example 5: Dynamic Width Calculation Example
-- -- -- 
-- -- -- Given controls with widths:
-- -- --   - first_name: width = [12, 6, 3]  -> Desktop weight: 3
-- -- --   - last_name:  width = [12, 6, 3]  -> Desktop weight: 3
-- -- --   - email:      width = [12, 6, 4]  -> Desktop weight: 4
-- -- --   - phone:      width = [12, 6, 2]  -> Desktop weight: 2
-- -- --
-- -- -- With settings:
-- -- --   "columnWidths": { "first_name": "30%" }
-- -- --
-- -- -- Calculation:
-- -- --   - first_name: 30% (explicit)
-- -- --   - Remaining: 70% to distribute
-- -- --   - Total auto weights: 3 + 4 + 2 = 9
-- -- --   - last_name:  (3/9) * 70% = 23.33%
-- -- --   - email:      (4/9) * 70% = 31.11%
-- -- --   - phone:      (2/9) * 70% = 15.56%
-- -- -- -----------------------------------------------------------------------------

-- -- -- Let's see the actual widths stored in controls
-- -- SELECT 
-- --     code,
-- --     [key],
-- --     label,
-- --     width,
-- --     CASE 
-- --         WHEN width LIKE '[%' THEN JSON_VALUE(width, '$[2]')  -- Desktop (3rd element)
-- --         ELSE width
-- --     END AS desktop_width_unit
-- -- FROM dbo.control
-- -- WHERE code IN (
-- --     SELECT child_control_code 
-- --     FROM dbo.control_group 
-- --     WHERE control_code = 'employee_table'
-- -- )
-- -- ORDER BY sort_order;

-- -- GO

-- -- -- -----------------------------------------------------------------------------
-- -- -- Example 6: Update Individual Column Settings
-- -- -- When you need to update settings for specific columns only
-- -- -- -----------------------------------------------------------------------------

-- -- -- First, get current settings
-- -- DECLARE @current_settings NVARCHAR(MAX);
-- -- SELECT @current_settings = additional_settings
-- -- FROM dbo.control_group
-- -- WHERE control_code = 'employee_table'
-- --   AND child_control_code = (SELECT code FROM dbo.control WHERE [key] = 'email');

-- -- -- Then update with merged settings (in practice, do this in application code)
-- -- UPDATE dbo.control_group
-- -- SET additional_settings = JSON_MODIFY(
-- --     ISNULL(additional_settings, '{}'),
-- --     '$.columnWidths.email',
-- --     '35%'
-- -- )
-- -- WHERE control_code = 'employee_table';

-- -- GO

-- -- -- -----------------------------------------------------------------------------
-- -- -- Example 7: Clear/Reset Settings
-- -- -- Remove all additional settings to use defaults
-- -- -- -----------------------------------------------------------------------------
-- -- UPDATE dbo.control_group
-- -- SET additional_settings = NULL
-- -- WHERE control_code = 'employee_table';

-- -- -- Or reset to empty object
-- -- UPDATE dbo.control_group
-- -- SET additional_settings = '{}'
-- -- WHERE control_code = 'employee_table';

-- -- GO

-- -- -- -----------------------------------------------------------------------------
-- -- -- Example 8: Query to See All Table Settings
-- -- -- Useful for documentation and auditing
-- -- -- -----------------------------------------------------------------------------
-- -- SELECT 
-- --     cg.control_code AS table_code,
-- --     c_table.label AS table_label,
-- --     cg.child_control_code AS column_code,
-- --     c_col.[key] AS column_key,
-- --     c_col.label AS column_label,
-- --     c_col.width AS column_width,
-- --     cg.additional_settings,
-- --     JSON_VALUE(cg.additional_settings, '$.hiddenColumns') AS is_hidden_array,
-- --     JSON_VALUE(cg.additional_settings, '$.columnWidths.' + c_col.[key]) AS custom_width,
-- --     cg.sort_order
-- -- FROM dbo.control_group cg
-- -- JOIN dbo.control c_table ON cg.control_code = c_table.code
-- -- JOIN dbo.control c_col ON cg.child_control_code = c_col.code
-- -- WHERE c_table.type = 'TABLE'
-- -- ORDER BY cg.control_code, cg.sort_order;

-- -- GO

-- -- -- -----------------------------------------------------------------------------
-- -- -- Example 9: Validation Query
-- -- -- Check if all hiddenColumns references are valid
-- -- -- -----------------------------------------------------------------------------
-- -- SELECT 
-- --     cg.control_code,
-- --     hidden_col.value AS hidden_column_key,
-- --     CASE 
-- --         WHEN c.code IS NULL THEN 'INVALID - Column not found'
-- --         ELSE 'Valid'
-- --     END AS validation_status
-- -- FROM dbo.control_group cg
-- -- CROSS APPLY OPENJSON(cg.additional_settings, '$.hiddenColumns') hidden_col
-- -- LEFT JOIN dbo.control c ON c.[key] = hidden_col.value
-- --     AND c.code IN (
-- --         SELECT child_control_code 
-- --         FROM dbo.control_group 
-- --         WHERE control_code = cg.control_code
-- --     )
-- -- WHERE cg.additional_settings IS NOT NULL
-- --   AND ISJSON(cg.additional_settings) = 1;

-- -- GO

-- -- -- -----------------------------------------------------------------------------
-- -- -- Example 10: Bulk Update - Apply Same Settings to Multiple Tables
-- -- -- Useful when multiple tables share similar column hiding needs
-- -- -- -----------------------------------------------------------------------------
-- -- UPDATE dbo.control_group
-- -- SET additional_settings = '{
-- --     "hiddenColumns": ["created_at", "updated_at", "created_by", "updated_by"]
-- -- }'
-- -- WHERE control_code IN ('employee_table', 'department_table', 'project_table')
-- --   AND child_control_code IN (
-- --       SELECT code 
-- --       FROM dbo.control 
-- --       WHERE [key] IN ('created_at', 'updated_at', 'created_by', 'updated_by')
-- --   );

-- -- GO

-- -- -- -----------------------------------------------------------------------------
-- -- -- Notes:
-- -- -- 1. Always validate JSON before inserting: ISJSON(additional_settings) = 1
-- -- -- 2. Column keys in hiddenColumns must match control.[key] exactly
-- -- -- 3. Percentages in columnWidths should ideally total <= 100%
-- -- -- 4. Missing additionalSettings means use default behavior (all visible)
-- -- -- 5. The frontend table component handles all calculations automatically
-- -- -- -----------------------------------------------------------------------------
