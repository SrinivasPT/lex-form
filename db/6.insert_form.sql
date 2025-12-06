/*
# Control Master form creation
- First create Form in form table with code 'control_form'
- Create a section control_form_section in control table with form code as 'control_form'
- Associate control_form_section with control_table in control_group table
*/

USE lex_form_db
GO

-- Insert the form
INSERT INTO dbo.form (code, version, label, description, is_published)
VALUES ('control_form', '1.0.0', 'Control Form', 'Form for managing controls', 1);

-- Insert the section control
INSERT INTO dbo.control (
    code,
    form_code,
    atomic_level_code,
    type,
    [key],
    label,
    sort_order,
    layout_config
)
VALUES (
    'control_form_section',
    'control_form',
    'SECTION',
    'GROUP',
    'control',
    'Controls',
    1,
    '[12]'
);

-- Associate the section with the control table control
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES ('control_form_section', 'control.table', 1);

-- Associate the section with form table related BASE controls
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
SELECT 'control_form_section', code, ROW_NUMBER() OVER (ORDER BY sort_order) + 1
FROM dbo.control
WHERE atomic_level_code = 'BASE' AND source_table = 'form' AND code NOT LIKE '%sys_start_time%' AND code NOT LIKE '%sys_end_time%';

GO