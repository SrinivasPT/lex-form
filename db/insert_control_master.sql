/*
Generate the insert statements for control master data
- Treat each column of the table in schema.sql as a field to be inserted
- table_name, column_name, column_data_type are as per schema.sql
- code is a unique identifier for each control and it will be formed as <table_name>.<column_name>
- key will be column name converted to camelCase
- label - come up with a human friendly label for each control based on column name
- width - If the column is going to hold large text date, set to 12, if text is medium set to 6, else set to 4
- sort_order - assign a sort order starting from 1 for each control in the order they appear in schema.sql
- Insert statements should be in the order of appearance in schema.sql
- Based on the not null constraints in schema.sql, set required field accordingly
- If the column_data_type is VARCHAR with specific size, add the maxLength. If the VARCHAR field is required, then add minLength as 2
*/

USE lex_form_db
GO

INSERT INTO dbo.control (
    code, table_name, column_name, column_data_type, [key], type, label, width, required, max_length, min_length
) VALUES
-- domain_data table
('domain_data.category_code', 'domain_data', 'category_code', 'VARCHAR(128)', 'categoryCode', 'text', 'Category Code', '4', 0, 128, NULL),
('domain_data.code', 'domain_data', 'code', 'VARCHAR(255)', 'code', 'text', 'Code', '6', 1, 255, 2),
('domain_data.display_text', 'domain_data', 'display_text', 'VARCHAR(255)', 'displayText', 'text', 'Display Text', '6', 1, 255, 2),
('domain_data.parent_code', 'domain_data', 'parent_code', 'VARCHAR(255)', 'parentCode', 'text', 'Parent Code', '6', 0, 255, NULL),
('domain_data.sort_order', 'domain_data', 'sort_order', 'INT', 'sortOrder', 'number', 'Sort Order', '4', 0, NULL, NULL),
('domain_data.guid', 'domain_data', 'guid', 'UNIQUEIDENTIFIER', 'guid', 'text', 'GUID', '12', 0, NULL, NULL),

-- form table
('form.code', 'form', 'code', 'VARCHAR(128)', 'code', 'text', 'Code', '4', 1, 128, 2),
('form.version', 'form', 'version', 'VARCHAR(32)', 'version', 'text', 'Version', '4', 1, 32, 2),
('form.label', 'form', 'label', 'VARCHAR(255)', 'label', 'text', 'Label', '6', 1, 255, 2),
('form.guid', 'form', 'guid', 'UNIQUEIDENTIFIER', 'guid', 'text', 'GUID', '12', 0, NULL, NULL),

-- section table
('section.code', 'section', 'code', 'VARCHAR(128)', 'code', 'text', 'Code', '4', 1, 128, 2),
('section.form_code', 'section', 'form_code', 'VARCHAR(128)', 'formCode', 'text', 'Form Code', '4', 1, 128, 2),
('section.label', 'section', 'label', 'VARCHAR(255)', 'label', 'text', 'Label', '6', 0, 255, NULL),
('section.key', 'section', 'key', 'VARCHAR(128)', 'key', 'text', 'Key', '4', 0, 128, NULL),
('section.width', 'section', 'width', 'VARCHAR(MAX)', 'width', 'text', 'Width', '12', 0, NULL, NULL),
('section.guid', 'section', 'guid', 'UNIQUEIDENTIFIER', 'guid', 'text', 'GUID', '12', 0, NULL, NULL),

-- section_mapping table
('section_mapping.form_code', 'section_mapping', 'form_code', 'VARCHAR(128)', 'formCode', 'text', 'Form Code', '4', 1, 128, 2),
('section_mapping.section_code', 'section_mapping', 'section_code', 'VARCHAR(128)', 'sectionCode', 'text', 'Section Code', '4', 1, 128, 2),
('section_mapping.sort_order', 'section_mapping', 'sort_order', 'INT', 'sortOrder', 'number', 'Sort Order', '4', 0, NULL, NULL),
('section_mapping.guid', 'section_mapping', 'guid', 'UNIQUEIDENTIFIER', 'guid', 'text', 'GUID', '12', 0, NULL, NULL),

-- control table
('control.code', 'control', 'code', 'VARCHAR(128)', 'code', 'text', 'Code', '4', 1, 128, 2),
('control.table_name', 'control', 'table_name', 'VARCHAR(128)', 'tableName', 'text', 'Table Name', '4', 1, 128, 2),
('control.column_name', 'control', 'column_name', 'VARCHAR(128)', 'columnName', 'text', 'Column Name', '4', 1, 128, 2),
('control.column_data_type', 'control', 'column_data_type', 'VARCHAR(64)', 'columnDataType', 'text', 'Column Data Type', '4', 1, 64, 2),
('control.key', 'control', 'key', 'VARCHAR(128)', 'key', 'text', 'Key', '4', 1, 128, 2),
('control.type', 'control', 'type', 'VARCHAR(32)', 'type', 'text', 'Type', '4', 0, 32, NULL),
('control.label', 'control', 'label', 'VARCHAR(255)', 'label', 'text', 'Label', '6', 0, 255, NULL),
('control.placeholder', 'control', 'placeholder', 'VARCHAR(255)', 'placeholder', 'text', 'Placeholder', '6', 0, 255, NULL),
('control.width', 'control', 'width', 'VARCHAR(MAX)', 'width', 'text', 'Width', '12', 0, NULL, NULL),
('control.options', 'control', 'options', 'VARCHAR(MAX)', 'options', 'text', 'Options', '12', 0, NULL, NULL),
('control.category_code', 'control', 'category_code', 'VARCHAR(128)', 'categoryCode', 'text', 'Category Code', '4', 0, 128, NULL),
('control.dependent_on', 'control', 'dependent_on', 'VARCHAR(128)', 'dependentOn', 'text', 'Dependent On', '4', 0, 128, NULL),
('control.visible_when', 'control', 'visible_when', 'VARCHAR(MAX)', 'visibleWhen', 'text', 'Visible When', '12', 0, NULL, NULL),
('control.disabled_when', 'control', 'disabled_when', 'VARCHAR(MAX)', 'disabledWhen', 'text', 'Disabled When', '12', 0, NULL, NULL),
('control.required_when', 'control', 'required_when', 'VARCHAR(MAX)', 'requiredWhen', 'text', 'Required When', '12', 0, NULL, NULL),
('control.required', 'control', 'required', 'BIT', 'required', 'checkbox', 'Required', '4', 0, NULL, NULL),
('control.min', 'control', 'min', 'INT', 'min', 'number', 'Min', '4', 0, NULL, NULL),
('control.max', 'control', 'max', 'INT', 'max', 'number', 'Max', '4', 0, NULL, NULL),
('control.min_length', 'control', 'min_length', 'INT', 'minLength', 'number', 'Min Length', '4', 0, NULL, NULL),
('control.max_length', 'control', 'max_length', 'INT', 'maxLength', 'number', 'Max Length', '4', 0, NULL, NULL),
('control.pattern', 'control', 'pattern', 'VARCHAR(255)', 'pattern', 'text', 'Pattern', '6', 0, 255, NULL),
('control.email', 'control', 'email', 'BIT', 'email', 'checkbox', 'Email', '4', 0, NULL, NULL),
('control.required_true', 'control', 'required_true', 'BIT', 'requiredTrue', 'checkbox', 'Required True', '4', 0, NULL, NULL),
('control.row_config', 'control', 'row_config', 'VARCHAR(MAX)', 'rowConfig', 'text', 'Row Config', '12', 0, NULL, NULL),
('control.pagination', 'control', 'pagination', 'VARCHAR(MAX)', 'pagination', 'text', 'Pagination', '12', 0, NULL, NULL),
('control.searchable', 'control', 'searchable', 'BIT', 'searchable', 'checkbox', 'Searchable', '4', 0, NULL, NULL),
('control.sortable', 'control', 'sortable', 'BIT', 'sortable', 'checkbox', 'Sortable', '4', 0, NULL, NULL),
('control.row_actions', 'control', 'row_actions', 'VARCHAR(MAX)', 'rowActions', 'text', 'Row Actions', '12', 0, NULL, NULL),
('control.header_actions', 'control', 'header_actions', 'VARCHAR(MAX)', 'headerActions', 'text', 'Header Actions', '12', 0, NULL, NULL),
('control.max_inline_actions', 'control', 'max_inline_actions', 'INT', 'maxInlineActions', 'number', 'Max Inline Actions', '4', 0, NULL, NULL),
('control.add_label', 'control', 'add_label', 'VARCHAR(255)', 'addLabel', 'text', 'Add Label', '6', 0, 255, NULL),
('control.mobile_behavior', 'control', 'mobile_behavior', 'VARCHAR(32)', 'mobileBehavior', 'text', 'Mobile Behavior', '4', 0, 32, NULL),
('control.guid', 'control', 'guid', 'UNIQUEIDENTIFIER', 'guid', 'text', 'GUID', '12', 0, NULL, NULL),

-- section_control_mapping table
('section_control_mapping.section_code', 'section_control_mapping', 'section_code', 'VARCHAR(128)', 'sectionCode', 'text', 'Section Code', '4', 1, 128, 2),
('section_control_mapping.control_code', 'section_control_mapping', 'control_code', 'VARCHAR(128)', 'controlCode', 'text', 'Control Code', '4', 1, 128, 2),
('section_control_mapping.sort_order', 'section_control_mapping', 'sort_order', 'INT', 'sortOrder', 'number', 'Sort Order', '4', 0, NULL, NULL),
('section_control_mapping.guid', 'section_control_mapping', 'guid', 'UNIQUEIDENTIFIER', 'guid', 'text', 'GUID', '12', 0, NULL, NULL);

GO

