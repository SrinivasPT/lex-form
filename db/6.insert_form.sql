/*
# Control Master form creation
- First create Form in form table with code 'control_form'
- Create a section control_form_section in control table with form_code as 'control_form'
- Associate control_form_section with control_table in control_group table
- Define complete form schema for editing control metadata
*/

USE lex_form_db
GO

-- =============================================
-- 1. Insert the control_form form definition
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.form WHERE code = 'control_form')
BEGIN
    INSERT INTO dbo.form (code, version, label, description, is_published)
    VALUES ('control_form', '1.0.0', 'Control Form', 'Form for managing control metadata', 1);
END
GO

-- =============================================
-- 2. Create the main section for control_form
-- =============================================
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_form_section')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        label,
        sort_order,
        width
    )
    VALUES (
        'control_form_section',
        'SECTION',
        'section',
        'Control Configuration',
        1,
        '[12]'
    );
END
GO

-- =============================================
-- 3. Create metadata controls for editing control properties
-- =============================================

-- Basic Information Group
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_basic_group')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        sort_order
    )
    VALUES (
        'control_basic_group',
        'GROUP',
        'group',
        NULL,
        'Basic Information',
        1
    );
END
GO

-- Code field (read-only for existing controls)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_code_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        is_required,
        pattern
    )
    VALUES (
        'control_code_input',
        'BASE',
        'text',
        'code',
        'Code',
        'e.g., employee_name_section',
        'Unique identifier for this control',
        1,
        '[12, 6]',
        1,
        '^[a-z0-9_]+$'
    );
END
GO

-- Atomic Level dropdown
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_atomic_level_select')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        help_text,
        sort_order,
        width,
        is_required,
        category_code
    )
    VALUES (
        'control_atomic_level_select',
        'BASE',
        'select',
        'atomic_level_code',
        'Atomic Level',
        'Classification level of this control',
        2,
        '[12, 6]',
        1,
        'ATOMIC_LEVEL'
    );
END
GO

-- Type dropdown (cascading based on atomic_level_code)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_type_select')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        help_text,
        sort_order,
        width,
        is_required,
        category_code,
        dependent_on
    )
    VALUES (
        'control_type_select',
        'BASE',
        'select',
        'type',
        'Control Type',
        'Specific type/variant of the control',
        3,
        '[12, 6]',
        1,
        'CONTROL_TYPE',
        'atomic_level_code'
    );
END
GO

-- Key field
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_key_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        pattern
    )
    VALUES (
        'control_key_input',
        'BASE',
        'text',
        'key',
        'Data Key',
        'e.g., employeeName (camelCase)',
        'Property name for data binding',
        4,
        '[12, 6]',
        '^[a-z][a-zA-Z0-9]*$'
    );
END
GO

-- Label field
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_label_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        is_required,
        max_length
    )
    VALUES (
        'control_label_input',
        'BASE',
        'text',
        'label',
        'Display Label',
        'e.g., Employee Name',
        'User-facing label text',
        5,
        '[12, 6]',
        1,
        255
    );
END
GO

-- Placeholder field
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_placeholder_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        max_length
    )
    VALUES (
        'control_placeholder_input',
        'BASE',
        'text',
        'placeholder',
        'Placeholder Text',
        'Enter placeholder...',
        'Hint text shown in empty inputs',
        6,
        '[12, 6]',
        255
    );
END
GO

-- Help Text field
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_help_text_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        max_length
    )
    VALUES (
        'control_help_text_input',
        'BASE',
        'textarea',
        'help_text',
        'Help Text',
        'Enter help text or tooltip content...',
        'Contextual help or aria description',
        7,
        '[12]',
        500
    );
END
GO

-- Sort Order field
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_sort_order_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        is_required,
        min_val,
        max_val
    )
    VALUES (
        'control_sort_order_input',
        'BASE',
        'number',
        'sort_order',
        'Sort Order',
        '0',
        'Display order within parent container',
        8,
        '[12, 4]',
        1,
        0,
        9999
    );
END
GO

-- Width field (JSON array)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_width_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_width_input',
        'BASE',
        'text',
        'width',
        'Width (Responsive)',
        '[12, 6, 4]',
        'Grid width as JSON array [mobile, tablet, desktop]',
        9,
        '[12, 4]'
    );
END
GO

-- Layout & Styling Group
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_layout_group')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        sort_order,
        visible_when
    )
    VALUES (
        'control_layout_group',
        'GROUP',
        'group',
        NULL,
        'Layout & Styling',
        2,
        'atomic_level_code !== "BASE"'
    );
END
GO

-- Additional Settings (JSON)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_additional_settings_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_additional_settings_input',
        'BASE',
        'textarea',
        'additional_settings',
        'Additional Settings (JSON)',
        '{"className": "custom-class"}',
        'JSON object for extended layout configuration',
        1,
        '[12]'
    );
END
GO

-- Data Binding Group (only for BASE controls)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_binding_group')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        sort_order,
        visible_when
    )
    VALUES (
        'control_binding_group',
        'GROUP',
        'group',
        NULL,
        'Data Binding',
        3,
        'atomic_level_code === "BASE"'
    );
END
GO

-- Source Table
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_source_table_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_source_table_input',
        'BASE',
        'text',
        'source_table',
        'Source Table',
        'employee',
        'Database table this control maps to',
        1,
        '[12, 6]'
    );
END
GO

-- Source Column
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_source_column_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_source_column_input',
        'BASE',
        'text',
        'source_column',
        'Source Column',
        'first_name',
        'Database column this control maps to',
        2,
        '[12, 6]'
    );
END
GO

-- Source Data Type
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_source_data_type_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_source_data_type_input',
        'BASE',
        'text',
        'source_data_type',
        'Source Data Type',
        'NVARCHAR(255)',
        'SQL data type of the source column',
        3,
        '[12, 6]'
    );
END
GO

-- Validation Rules Group
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_validation_group')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        sort_order,
        visible_when
    )
    VALUES (
        'control_validation_group',
        'GROUP',
        'group',
        NULL,
        'Validation Rules',
        4,
        'atomic_level_code === "BASE"'
    );
END
GO

-- Is Required checkbox
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_is_required_checkbox')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_is_required_checkbox',
        'BASE',
        'checkbox',
        'is_required',
        'Required',
        'Field must have a value',
        1,
        '[12, 6]'
    );
END
GO

-- Is Readonly checkbox
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_is_readonly_checkbox')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_is_readonly_checkbox',
        'BASE',
        'checkbox',
        'is_readonly',
        'Read Only',
        'Field cannot be edited',
        2,
        '[12, 6]'
    );
END
GO

-- Min Value
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_min_val_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        visible_when
    )
    VALUES (
        'control_min_val_input',
        'BASE',
        'number',
        'min_val',
        'Minimum Value',
        '0',
        'Minimum numeric value allowed',
        3,
        '[12, 4]',
        'type === "number"'
    );
END
GO

-- Max Value
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_max_val_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        visible_when
    )
    VALUES (
        'control_max_val_input',
        'BASE',
        'number',
        'max_val',
        'Maximum Value',
        '100',
        'Maximum numeric value allowed',
        4,
        '[12, 4]',
        'type === "number"'
    );
END
GO

-- Min Length
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_min_length_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        visible_when
    )
    VALUES (
        'control_min_length_input',
        'BASE',
        'number',
        'min_length',
        'Minimum Length',
        '0',
        'Minimum string length required',
        5,
        '[12, 4]',
        'type === "text" || type === "textarea" || type === "email"'
    );
END
GO

-- Max Length
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_max_length_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        visible_when
    )
    VALUES (
        'control_max_length_input',
        'BASE',
        'number',
        'max_length',
        'Maximum Length',
        '255',
        'Maximum string length allowed',
        6,
        '[12, 4]',
        'type === "text" || type === "textarea" || type === "email"'
    );
END
GO

-- Pattern (Regex)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_pattern_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width,
        visible_when
    )
    VALUES (
        'control_pattern_input',
        'BASE',
        'text',
        'pattern',
        'Pattern (Regex)',
        '^[A-Za-z0-9]+$',
        'Regular expression for validation',
        7,
        '[12]',
        'type === "text" || type === "email" || type === "tel"'
    );
END
GO

-- Domain Logic Group
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_domain_group')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        sort_order,
        visible_when
    )
    VALUES (
        'control_domain_group',
        'GROUP',
        'group',
        NULL,
        'Domain & Dependencies',
        5,
        'atomic_level_code === "BASE" && type === "select"'
    );
END
GO

-- Category Code (for dropdowns)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_category_code_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_category_code_input',
        'BASE',
        'text',
        'category_code',
        'Category Code',
        'COUNTRY_CODE',
        'Domain data category for dropdown options',
        1,
        '[12, 6]'
    );
END
GO

-- Dependent On (cascading dropdowns)
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_dependent_on_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_dependent_on_input',
        'BASE',
        'text',
        'dependent_on',
        'Dependent On',
        'country_code',
        'Key of parent control for cascading',
        2,
        '[12, 6]'
    );
END
GO

-- Conditional Logic Group
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_conditional_group')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        sort_order
    )
    VALUES (
        'control_conditional_group',
        'GROUP',
        'group',
        NULL,
        'Conditional Logic',
        6
    );
END
GO

-- Visible When
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_visible_when_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_visible_when_input',
        'BASE',
        'textarea',
        'visible_when',
        'Visible When',
        'employeeType === "fulltime"',
        'Expression: control visible when true',
        1,
        '[12]'
    );
END
GO

-- Disabled When
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_disabled_when_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_disabled_when_input',
        'BASE',
        'textarea',
        'disabled_when',
        'Disabled When',
        'status === "archived"',
        'Expression: control disabled when true',
        2,
        '[12]'
    );
END
GO

-- Required When
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_required_when_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_required_when_input',
        'BASE',
        'textarea',
        'required_when',
        'Required When',
        'employeeType === "contractor"',
        'Expression: control required when true',
        3,
        '[12]'
    );
END
GO

-- Extended Properties Group
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_properties_group')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        sort_order
    )
    VALUES (
        'control_properties_group',
        'GROUP',
        'group',
        NULL,
        'Extended Properties',
        7
    );
END
GO

-- Properties JSON
IF NOT EXISTS (SELECT 1 FROM dbo.control WHERE code = 'control_properties_json_input')
BEGIN
    INSERT INTO dbo.control (
        code,
        atomic_level_code,
        type,
        [key],
        label,
        placeholder,
        help_text,
        sort_order,
        width
    )
    VALUES (
        'control_properties_json_input',
        'BASE',
        'textarea',
        'properties_json',
        'Properties (JSON)',
        '{"accept": ".pdf", "maxSize": 5000}',
        'Type-specific configuration as JSON object',
        1,
        '[12]'
    );
END
GO

-- =============================================
-- 4. Associate controls with groups
-- =============================================

-- Associate Basic Information Group with its controls
DELETE FROM dbo.control_group WHERE control_code = 'control_basic_group';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_basic_group', 'control_code_input', 1),
    ('control_basic_group', 'control_atomic_level_select', 2),
    ('control_basic_group', 'control_type_select', 3),
    ('control_basic_group', 'control_key_input', 4),
    ('control_basic_group', 'control_label_input', 5),
    ('control_basic_group', 'control_placeholder_input', 6),
    ('control_basic_group', 'control_help_text_input', 7),
    ('control_basic_group', 'control_sort_order_input', 8),
    ('control_basic_group', 'control_width_input', 9);

-- Associate Layout Group with its controls
DELETE FROM dbo.control_group WHERE control_code = 'control_layout_group';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_layout_group', 'control_additional_settings_input', 1);

-- Associate Data Binding Group with its controls
DELETE FROM dbo.control_group WHERE control_code = 'control_binding_group';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_binding_group', 'control_source_table_input', 1),
    ('control_binding_group', 'control_source_column_input', 2),
    ('control_binding_group', 'control_source_data_type_input', 3);

-- Associate Validation Group with its controls
DELETE FROM dbo.control_group WHERE control_code = 'control_validation_group';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_validation_group', 'control_is_required_checkbox', 1),
    ('control_validation_group', 'control_is_readonly_checkbox', 2),
    ('control_validation_group', 'control_min_val_input', 3),
    ('control_validation_group', 'control_max_val_input', 4),
    ('control_validation_group', 'control_min_length_input', 5),
    ('control_validation_group', 'control_max_length_input', 6),
    ('control_validation_group', 'control_pattern_input', 7);

-- Associate Domain Logic Group with its controls
DELETE FROM dbo.control_group WHERE control_code = 'control_domain_group';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_domain_group', 'control_category_code_input', 1),
    ('control_domain_group', 'control_dependent_on_input', 2);

-- Associate Conditional Logic Group with its controls
DELETE FROM dbo.control_group WHERE control_code = 'control_conditional_group';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_conditional_group', 'control_visible_when_input', 1),
    ('control_conditional_group', 'control_disabled_when_input', 2),
    ('control_conditional_group', 'control_required_when_input', 3);

-- Associate Extended Properties Group with its controls
DELETE FROM dbo.control_group WHERE control_code = 'control_properties_group';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_properties_group', 'control_properties_json_input', 1);

-- Associate main section with all groups
DELETE FROM dbo.control_group WHERE control_code = 'control_form_section';
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES
    ('control_form_section', 'control_basic_group', 1),
    ('control_form_section', 'control_layout_group', 2),
    ('control_form_section', 'control_binding_group', 3),
    ('control_form_section', 'control_validation_group', 4),
    ('control_form_section', 'control_domain_group', 5),
    ('control_form_section', 'control_conditional_group', 6),
    ('control_form_section', 'control_properties_group', 7);

GO

PRINT 'Control Form schema created successfully!'
GO

-- =============================================
-- EMPLOYEE FORM CREATION
-- =============================================

GO

