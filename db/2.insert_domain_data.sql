-- Insert domain data for countries
USE lex_form_db
GO

INSERT INTO dbo.domain_data (category_code, code, display_text, parent_code, extension_json)
VALUES
    ('COUNTRY_CODE', 'US', 'United States', NULL, '{}'),
    ('COUNTRY_CODE', 'CA', 'Canada', NULL, '{}'),
    ('COUNTRY_CODE', 'UK', 'United Kingdom', NULL, '{}');

-- Insert domain data for states
INSERT INTO dbo.domain_data (category_code, code, display_text, parent_code, extension_json)
VALUES
    ('STATE_CODE', 'NY', 'New York', 'US', '{}'),
    ('STATE_CODE', 'CA', 'California', 'US', '{}'),
    ('STATE_CODE', 'TX', 'Texas', 'US', '{}'),
    ('STATE_CODE', 'ON', 'Ontario', 'CA', '{}'),
    ('STATE_CODE', 'QC', 'Quebec', 'CA', '{}'),
    ('STATE_CODE', 'BC', 'British Columbia', 'CA', '{}');

-- Insert domain data for atomic levels
INSERT INTO dbo.domain_data (category_code, code, display_text, sort_order, extension_json)
VALUES
    ('ATOMIC_LEVEL_CODE', 'BASE', 'Base Control', 1, '{"description":"Database column-level controls"}'),
    ('ATOMIC_LEVEL_CODE', 'COMPOSITE', 'Composite Control', 2, '{"description":"Table-level aggregates"}'),
    ('ATOMIC_LEVEL_CODE', 'SECTION', 'Section', 3, '{"description":"Top-level organizational containers"}'),
    ('ATOMIC_LEVEL_CODE', 'TAB', 'Tab', 4, '{"description":"Tabbed navigation containers"}'),
    ('ATOMIC_LEVEL_CODE', 'GROUP', 'Group', 5, '{"description":"Logical grouping containers"}');

-- Insert domain data for control types
INSERT INTO dbo.domain_data (category_code, code, display_text, parent_code, sort_order, extension_json)
VALUES
    -- BASE control types (parent: BASE atomic level)
    ('CONTROL_TYPE_CODE', 'text', 'Text Input', 'BASE', 1, '{"inputType":"text"}'),
    ('CONTROL_TYPE_CODE', 'number', 'Number Input', 'BASE', 2, '{"inputType":"number"}'),
    ('CONTROL_TYPE_CODE', 'email', 'Email Input', 'BASE', 3, '{"inputType":"email"}'),
    ('CONTROL_TYPE_CODE', 'password', 'Password Input', 'BASE', 4, '{"inputType":"password"}'),
    ('CONTROL_TYPE_CODE', 'tel', 'Telephone Input', 'BASE', 5, '{"inputType":"tel"}'),
    ('CONTROL_TYPE_CODE', 'url', 'URL Input', 'BASE', 6, '{"inputType":"url"}'),
    ('CONTROL_TYPE_CODE', 'date', 'Date Picker', 'BASE', 7, '{"inputType":"date"}'),
    ('CONTROL_TYPE_CODE', 'time', 'Time Picker', 'BASE', 8, '{"inputType":"time"}'),
    ('CONTROL_TYPE_CODE', 'datetime-local', 'DateTime Picker', 'BASE', 9, '{"inputType":"datetime-local"}'),
    ('CONTROL_TYPE_CODE', 'textarea', 'Text Area', 'BASE', 10, '{"inputType":"textarea"}'),
    ('CONTROL_TYPE_CODE', 'select', 'Dropdown Select', 'BASE', 11, '{"inputType":"select"}'),
    ('CONTROL_TYPE_CODE', 'checkbox', 'Checkbox', 'BASE', 12, '{"inputType":"checkbox"}'),
    ('CONTROL_TYPE_CODE', 'radio', 'Radio Button', 'BASE', 13, '{"inputType":"radio"}'),
    ('CONTROL_TYPE_CODE', 'file', 'File Upload', 'BASE', 14, '{"inputType":"file"}'),
    ('CONTROL_TYPE_CODE', 'tree', 'Tree Control', 'BASE', 15, '{"inputType":"tree"}'),
    -- COMPOSITE control types
    ('CONTROL_TYPE_CODE', 'table', 'Data Table', 'COMPOSITE', 20, '{"supportsChildren":true}'),
    ('CONTROL_TYPE_CODE', 'tree-grid', 'Tree Grid', 'COMPOSITE', 21, '{"supportsChildren":true}'),
    -- SECTION/TAB/GROUP control types
    ('CONTROL_TYPE_CODE', 'section', 'Section Container', 'SECTION', 30, '{"supportsChildren":true}'),
    ('CONTROL_TYPE_CODE', 'tab', 'Tab Container', 'TAB', 31, '{"supportsChildren":true}'),
    ('CONTROL_TYPE_CODE', 'group', 'Group Container', 'GROUP', 32, '{"supportsChildren":true}'),
    ('CONTROL_TYPE_CODE', 'fieldset', 'Fieldset', 'GROUP', 33, '{"supportsChildren":true}'),
    ('CONTROL_TYPE_CODE', 'panel', 'Panel', 'GROUP', 34, '{"supportsChildren":true}');
GO
