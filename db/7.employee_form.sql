USE lex_form_db
GO

-- Insert the Employee form
INSERT INTO dbo.form (code, version, label, description, is_published)
VALUES ('employee_form', '1.0.0', 'Employee Form', 'Form for managing employee information', 1);

-- Insert the employee section
INSERT INTO dbo.control (
    code,
    form_code,
    atomic_level_code,
    type,
    [key],
    label,
    sort_order,
    width
)
VALUES (
    'employee_section',
    'employee_form',
    'SECTION',
    'GROUP',
    'employee',
    'Employee Information',
    1,
    '[12]'
);

-- Insert the address section
INSERT INTO dbo.control (
    code,
    form_code,
    atomic_level_code,
    type,
    [key],
    label,
    sort_order,
    width
)
VALUES (
    'employee_address_section',
    NULL,
    'SECTION',
    'GROUP',
    'address',
    'Address Information',
    2,
    '[12]'
);

-- Insert the dependents section
INSERT INTO dbo.control (
    code,
    form_code,
    atomic_level_code,
    type,
    [key],
    label,
    sort_order,
    width
)
VALUES (
    'employee_dependents_section',
    NULL,
    'SECTION',
    'GROUP',
    'dependents',
    'Dependents',
    3,
    '[12]'
);

-- Associate employee section with employee table BASE controls
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
SELECT 'employee_section', code, ROW_NUMBER() OVER (ORDER BY sort_order)
FROM dbo.control
WHERE atomic_level_code = 'BASE' AND source_table = 'employee' AND code NOT LIKE '%sys_start_time%' AND code NOT LIKE '%sys_end_time%' AND code NOT LIKE '%guid%';

-- Associate address section with employee_address table BASE controls
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
SELECT 'employee_address_section', code, ROW_NUMBER() OVER (ORDER BY sort_order)
FROM dbo.control
WHERE atomic_level_code = 'BASE' AND source_table = 'employee_address' AND code NOT LIKE '%sys_start_time%' AND code NOT LIKE '%sys_end_time%' AND code NOT LIKE '%guid%';

-- Associate dependents section with employee_dependent table control
INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES ('employee_dependents_section', 'employee_dependent.table', 1);

INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES ('employee_section', 'employee_address_section', 2);

INSERT INTO dbo.control_group (control_code, child_control_code, sort_order)
VALUES ('employee_section', 'employee_dependents_section', 3);

GO