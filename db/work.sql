UPDATE dbo.control_group SET data_path = null
WHERE control_code = 'control_form_section' AND child_control_code = 'control.table';
GO

UPDATE dbo.control_group
SET
    visible_when = CASE child_control_code
        WHEN 'control.category_code' THEN 'model.type == "SELECT"'
        WHEN 'control.table' THEN 'model.atomicLevelCode == "SECTION"'
        WHEN 'control.dependent_on' THEN 'model.type == "SELECT"'
        WHEN 'control.min_val' THEN 'model.type == "NUMBER"'
        WHEN 'control.max_val' THEN 'model.type == "NUMBER"'
        WHEN 'control.min_length' THEN 'model.type == "TEXT"'
        WHEN 'control.max_length' THEN 'model.type == "TEXT"'
        WHEN 'control.pattern' THEN 'model.type == "TEXT"'
        WHEN 'control.source_table' THEN 'model.atomicLevelCode == "BASE"'
        WHEN 'control.source_column' THEN 'model.atomicLevelCode == "BASE"'
        WHEN 'control.source_data_type' THEN 'model.atomicLevelCode == "BASE"'
        WHEN 'control.properties_json' THEN '["FILE", "TABLE", "RADIO", "CHECKBOX"].includes(model.type)'
        ELSE NULL
    END,
    required_when = CASE child_control_code
        WHEN 'control.category_code' THEN 'model.type == "SELECT"'
        WHEN 'control.dependent_on' THEN 'model.type == "SELECT"'
        WHEN 'control.min_val' THEN 'model.type == "NUMBER"'
        WHEN 'control.max_val' THEN 'model.type == "NUMBER"'
        WHEN 'control.min_length' THEN 'model.type == "TEXT"'
        WHEN 'control.max_length' THEN 'model.type == "TEXT"'
        WHEN 'control.pattern' THEN 'model.type == "TEXT"'
        WHEN 'control.source_table' THEN 'model.atomicLevelCode == "BASE"'
        WHEN 'control.source_column' THEN 'model.atomicLevelCode == "BASE"'
        WHEN 'control.source_data_type' THEN 'model.atomicLevelCode == "BASE"'
        WHEN 'control.properties_json' THEN '["FILE", "TABLE", "RADIO", "CHECKBOX"].includes(model.type)'
        ELSE NULL
    END,
    is_readonly = CASE child_control_code
        WHEN 'control.guid' THEN 1
        WHEN 'control.source_table' THEN 1
        WHEN 'control.source_column' THEN 1
        WHEN 'control.source_data_type' THEN 1
        ELSE 0
    END,
    width = CASE child_control_code
        WHEN 'control.guid' THEN '[12, 6, 6]'
        WHEN 'control.code' THEN '[12, 4, 3]'
        WHEN 'control.atomic_level_code' THEN '[12, 4, 3]'
        WHEN 'control.form_code' THEN '[12, 4, 3]'
        WHEN 'control.parent_control_code' THEN '[12, 4, 3]'
        WHEN 'control.type' THEN '[12, 4, 3]'
        WHEN 'control.table' THEN '[12, 12, 12]'
        WHEN 'control.key' THEN '[12, 4, 3]'
        WHEN 'control.label' THEN '[12, 4, 3]'
        WHEN 'control.placeholder' THEN '[12, 4, 3]'
        WHEN 'control.help_text' THEN '[12, 4, 3]'
        WHEN 'control.sort_order' THEN '[12, 4, 4]'
        WHEN 'control.width' THEN '[12, 4, 3]'
        WHEN 'control.additional_settings' THEN '[12, 4, 3]'
        WHEN 'control.source_table' THEN '[12, 4, 3]'
        WHEN 'control.source_column' THEN '[12, 4, 3]'
        WHEN 'control.source_data_type' THEN '[12, 4, 3]'
        WHEN 'control.category_code' THEN '[12, 4, 3]'
        WHEN 'control.dependent_on' THEN '[12, 4, 3]'
        WHEN 'control.layout_config' THEN '[12, 6, 6]'
        WHEN 'control.visible_when' THEN '[12, 6, 6]'
        WHEN 'control.disabled_when' THEN '[12, 6, 6]'
        WHEN 'control.required_when' THEN '[12, 6, 6]'
        WHEN 'control.is_required' THEN '[12, 3, 3]'
        WHEN 'control.is_readonly' THEN '[12, 3, 3]'
        WHEN 'control.min_val' THEN '[12, 3, 3]'
        WHEN 'control.max_val' THEN '[12, 3, 3]'
        WHEN 'control.min_length' THEN '[12, 3, 3]'
        WHEN 'control.max_length' THEN '[12, 3, 3]'
        WHEN 'control.pattern' THEN '[12, 4, 3]'
        WHEN 'control.properties_json' THEN '[12, 4, 3]'
        ELSE width
    END,
    sort_order = CASE child_control_code
        WHEN 'control.guid' THEN 1
        WHEN 'control.code' THEN 2
        WHEN 'control.label' THEN 3
        WHEN 'control.form_code' THEN 3
        WHEN 'control.parent_control_code' THEN 3
        WHEN 'control.source_table' THEN 4
        WHEN 'control.source_column' THEN 5
        WHEN 'control.source_data_type' THEN 6
        WHEN 'control.atomic_level_code' THEN 7
        WHEN 'control.type' THEN 8
        WHEN 'control.key' THEN 9
        WHEN 'control.width' THEN 10
        WHEN 'control.min_val' THEN 11
        WHEN 'control.max_val' THEN 12
        WHEN 'control.min_length' THEN 13
        WHEN 'control.max_length' THEN 14
        WHEN 'control.pattern' THEN 15
        WHEN 'control.is_required' THEN 16
        WHEN 'control.is_readonly' THEN 17
        WHEN 'control.placeholder' THEN 18
        WHEN 'control.help_text' THEN 19
        WHEN 'control.sort_order' THEN 20
        WHEN 'control.category_code' THEN 21
        WHEN 'control.dependent_on' THEN 22
        WHEN 'control.layout_config' THEN 23
        WHEN 'control.additional_settings' THEN 24
        WHEN 'control.visible_when' THEN 25
        WHEN 'control.disabled_when' THEN 26
        WHEN 'control.required_when' THEN 27
        WHEN 'control.properties_json' THEN 28
        ELSE sort_order
    END
WHERE control_code = 'control_form_section';

