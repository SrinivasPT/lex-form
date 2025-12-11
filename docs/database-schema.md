# Database Schema and Form Construction

### Database Schema Overview

The form design relies on a SQL Server database with the following key tables:

-   **domain_data**: Stores master data and lookups (e.g., categories like countries, states) with cascading support via parent_code. Includes system versioning for history tracking.
-   **form**: The aggregate root for forms, containing code, version, label, description, and publication status. Supports versioning.
-   **control**: A recursive table representing all form elements (sections, groups, tables, inputs). Key fields include:
    -   atomic_level_code: 'FORM', 'SECTION', 'COMPOSITE' (for groups/tables), 'BASE' (for individual inputs).
    -   type: 'GROUP', 'TABLE', 'TEXT', 'SELECT', 'DATE', etc.
    -   Hierarchy via parent_control_code and control_group relationships.
    -   Properties for layout (width as JSON array), validation, expressions, and extended config (properties_json).
    -   Data binding: source_table, source_column, source_data_type for linking to database columns.
    -   Domain logic: category_code for lookups, dependent_on for cascading.
    -   Expressions: visible_when, disabled_when, required_when for dynamic behavior.
-   **control_group**: Defines relationships between controls, including data_path, width, and sort_order for hierarchical associations. Supports system versioning.

Indexes are created on control (form_code, parent_control_code, sort_order) and domain_data (category_code) for performance.

### Form Construction Process

Forms are constructed by inserting data into the above tables:

-   **Form Creation**: Insert into `form` table with code, version, etc.
-   **Sections and Groups**: Sections are treated as control groups (atomic_level_code='SECTION', type='GROUP'). Insert into `control` table.
-   **Control Associations**: Use `control_group` table to link sections to child controls (BASE controls from table columns or other sections/groups).
-   **BASE Controls**: Auto-generated from database table schemas (e.g., columns from 'employee' table become TEXT/SELECT controls based on source_table/source_column).
-   **Hierarchy Building**: Recursive relationships via control_group allow nesting (e.g., sections contain other sections or controls).

### Example: Employee Form

-   **Form**: 'employee_form' with sections like 'Employee Information', 'Address Information', 'Dependents'.
-   **Sections**: Inserted as controls with atomic_level_code='SECTION'.
-   **Associations**: control_group links sections to BASE controls (e.g., employee_section to controls from 'employee' table) and to sub-sections.
-   **Dependencies**: Controls can depend on others (e.g., state depends on country).

### Form Schema Generation

The form schema is generated as JSON using recursive queries (e.g., fn_GetControlChildren function in work.sql):

-   Builds nested hierarchy starting from root sections.
-   Includes control properties, validations, and child controls.
-   Output: JSON structure with sections, controls, and their configurations for rendering.

This background informs the designer's need to manage inserts/updates to form, control, and control_group tables, ensuring hierarchical relationships and schema generation for preview.
