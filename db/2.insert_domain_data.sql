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
    ('ATOMIC_LEVEL', 'BASE', 'Base Control', 1, '{"description":"Database column-level controls"}'),
    ('ATOMIC_LEVEL', 'COMPOSITE', 'Composite Control', 2, '{"description":"Table-level aggregates"}'),
    ('ATOMIC_LEVEL', 'SECTION', 'Section', 3, '{"description":"Top-level organizational containers"}'),
    ('ATOMIC_LEVEL', 'TAB', 'Tab', 4, '{"description":"Tabbed navigation containers"}'),
    ('ATOMIC_LEVEL', 'GROUP', 'Group', 5, '{"description":"Logical grouping containers"}');

-- Insert domain data for control types
INSERT INTO dbo.domain_data (category_code, code, display_text, parent_code, sort_order, extension_json)
VALUES
    -- BASE control types (parent: BASE atomic level)
    ('CONTROL_TYPE', 'text', 'Text Input', 'BASE', 1, '{"inputType":"text"}'),
    ('CONTROL_TYPE', 'number', 'Number Input', 'BASE', 2, '{"inputType":"number"}'),
    ('CONTROL_TYPE', 'email', 'Email Input', 'BASE', 3, '{"inputType":"email"}'),
    ('CONTROL_TYPE', 'password', 'Password Input', 'BASE', 4, '{"inputType":"password"}'),
    ('CONTROL_TYPE', 'tel', 'Telephone Input', 'BASE', 5, '{"inputType":"tel"}'),
    ('CONTROL_TYPE', 'url', 'URL Input', 'BASE', 6, '{"inputType":"url"}'),
    ('CONTROL_TYPE', 'date', 'Date Picker', 'BASE', 7, '{"inputType":"date"}'),
    ('CONTROL_TYPE', 'time', 'Time Picker', 'BASE', 8, '{"inputType":"time"}'),
    ('CONTROL_TYPE', 'datetime-local', 'DateTime Picker', 'BASE', 9, '{"inputType":"datetime-local"}'),
    ('CONTROL_TYPE', 'textarea', 'Text Area', 'BASE', 10, '{"inputType":"textarea"}'),
    ('CONTROL_TYPE', 'select', 'Dropdown Select', 'BASE', 11, '{"inputType":"select"}'),
    ('CONTROL_TYPE', 'checkbox', 'Checkbox', 'BASE', 12, '{"inputType":"checkbox"}'),
    ('CONTROL_TYPE', 'radio', 'Radio Button', 'BASE', 13, '{"inputType":"radio"}'),
    ('CONTROL_TYPE', 'file', 'File Upload', 'BASE', 14, '{"inputType":"file"}'),
    ('CONTROL_TYPE', 'tree', 'Tree Control', 'BASE', 15, '{"inputType":"tree"}'),
    -- COMPOSITE control types
    ('CONTROL_TYPE', 'table', 'Data Table', 'COMPOSITE', 20, '{"supportsChildren":true}'),
    ('CONTROL_TYPE', 'tree-grid', 'Tree Grid', 'COMPOSITE', 21, '{"supportsChildren":true}'),
    -- SECTION/TAB/GROUP control types
    ('CONTROL_TYPE', 'section', 'Section Container', 'SECTION', 30, '{"supportsChildren":true}'),
    ('CONTROL_TYPE', 'tab', 'Tab Container', 'TAB', 31, '{"supportsChildren":true}'),
    ('CONTROL_TYPE', 'group', 'Group Container', 'GROUP', 32, '{"supportsChildren":true}'),
    ('CONTROL_TYPE', 'fieldset', 'Fieldset', 'GROUP', 33, '{"supportsChildren":true}'),
    ('CONTROL_TYPE', 'panel', 'Panel', 'GROUP', 34, '{"supportsChildren":true}');
GO
