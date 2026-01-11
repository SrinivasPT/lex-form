# Form Admin Component Design

## Overview

The Form Admin component is a metadata-driven form editor that allows administrators to define and manage form schemas. It features a **tree-based navigation** on the left for selecting controls and a **dynamic form** on the right for editing the selected control's metadata properties.

### Purpose & Scope

**Form Admin is for**: Creating final forms and sections that application users will interact with. It manages the structure, layout, and associations of controls to build complete user-facing forms.

**Form Admin is NOT for**: Creating BASE controls (individual fields). BASE controls are automatically generated from database schema changes via a separate utility that detects delta columns and creates corresponding control entries.

### Key Concepts

**Everything is a Control**: In this system, all UI elements—sections, forms, tables, tabs, and even individual fields—are represented as controls in the `control` table. The control type and atomic level determine their behavior and rendering.

**Control Hierarchy**: Controls are organized in a parent-child relationship using the `control_group` table, which creates associations between parent controls and their children.

---

## Database Schema

### Control Table Structure

The `control` table is the central metadata repository with the following key fields:

```sql
control (
    code VARCHAR(128) PRIMARY KEY,          -- Unique identifier (e.g., 'employee.first_name')
    atomic_level_code VARCHAR(20),          -- BASE, COMPOSITE, SECTION
    type VARCHAR(32),                       -- TEXT, SELECT, DATE, FORM, SECTION, TABLE, TAB, etc.
    key VARCHAR(128),                       -- Data binding key (camelCase)
    label NVARCHAR(255),                    -- Display label
    placeholder NVARCHAR(255),              -- Placeholder text
    help_text NVARCHAR(500),                -- Tooltip/help text
    sort_order INT,                         -- Display order
    width NVARCHAR(MAX),                    -- Responsive width (JSON array)

    -- Data binding
    source_table VARCHAR(128),              -- Source database table
    source_column VARCHAR(128),             -- Source database column
    source_data_type VARCHAR(64),           -- Data type from DB

    -- Domain/dropdown logic
    category_code VARCHAR(128),             -- Links to domain_data for options
    dependent_on VARCHAR(128),              -- Parent control for cascading

    -- Conditional logic (expressions)
    visible_when NVARCHAR(MAX),             -- When to show
    disabled_when NVARCHAR(MAX),            -- When to disable
    required_when NVARCHAR(MAX),            -- When to require

    -- Validation
    is_required BIT,
    is_readonly BIT,
    min_val INT,
    max_val INT,
    min_length INT,
    max_length INT,
    pattern NVARCHAR(255),                  -- Regex pattern

    -- Extended configuration
    properties_json NVARCHAR(MAX),          -- Type-specific properties
    additional_settings NVARCHAR(MAX),      -- Complex layout settings

    -- Temporal tracking (built-in versioning)
    sys_start_time DATETIME2(7) GENERATED ALWAYS AS ROW START,
    sys_end_time DATETIME2(7) GENERATED ALWAYS AS ROW END
)
```

### Control Group Table Structure

The `control_group` table manages parent-child relationships:

```sql
control_group (
    control_code VARCHAR(128),              -- Parent control
    child_control_code VARCHAR(128),        -- Child control
    data_path VARCHAR(255),                 -- Data path override
    width NVARCHAR(MAX),                    -- Child's width in parent context
    sort_order INT,                         -- Display order within parent
    additional_settings NVARCHAR(MAX),      -- Context-specific settings

    PRIMARY KEY (control_code, child_control_code),
    FOREIGN KEY (control_code) REFERENCES control(code),
    FOREIGN KEY (child_control_code) REFERENCES control(code)
)
```

### Atomic Levels

-   **BASE**: Individual field controls (TEXT, SELECT, DATE, etc.) that map to table columns
-   **COMPOSITE**: Complex controls like TABLE, FORM that contain other controls
-   **SECTION**: Grouping controls that organize the layout (TAB, GROUP, SECTION)

### Control Types by Atomic Level

**BASE Controls (atomic_level_code = 'BASE')**:

-   TEXT, SELECT, DATE, CHECKBOX, RADIO, FILE, NUMBER, TEXTAREA, etc.
-   Map directly to database columns

**COMPOSITE Controls (atomic_level_code = 'COMPOSITE')**:

-   TABLE - Represents a database table with all its columns as children
-   FORM - Top-level form definition

**SECTION Controls (atomic_level_code = 'SECTION')**:

-   SECTION - Basic grouping with title
-   TAB - Tab-based grouping
-   GROUP - Generic container

**Note**: Form Admin allows creating SECTION controls (SECTION, TAB, GROUP types) to organize form structure. These are the controls admins can create manually.

### Example Control Relationships

```
employee.table (COMPOSITE, TABLE)
├── employee.first_name (BASE, TEXT)
├── employee.last_name (BASE, TEXT)
├── employee.date_of_birth (BASE, DATE)
└── employee.email (BASE, TEXT)

employee_section (SECTION, SECTION)
├── employee.table (COMPOSITE, TABLE)
└── employee_address_section (SECTION, SECTION)
    ├── employee.address.street (BASE, TEXT)
    ├── employee.address.city (BASE, TEXT)
    └── employee.address.state (BASE, SELECT)
```

---

### Component Structure

```
┌─────────────────────────────────────────────────────┐
│              Form Administration Header              │
├──────────────────┬──────────────────────────────────┤
│                  │                                   │
│  Tree Panel      │      Form Panel                  │
│  (Left)          │      (Right)                     │
│                  │                                   │
│  ┌────────────┐  │  ┌──────────────────────────┐   │
│  │ Tree       │  │  │ Dynamic Form             │   │
│  │ Control    │  │  │ (Schema-driven)          │   │
│  │            │  │  │                          │   │
│  │ - Root     │  │  │ Fields based on          │   │
│  │   - Child1 │──┼─>│ selected node type       │   │
│  │   - Child2 │  │  │                          │   │
│  │            │  │  │ [Save] [Reset]           │   │
│  └────────────┘  │  └──────────────────────────┘   │
│                  │                                   │
│  Selected:       │  Loading/Success/Error Messages  │
│  control.table   │                                   │
└──────────────────┴──────────────────────────────────┘
```

### Component Responsibilities

**FormAdminControlComponent** (`form-admin-control.component.ts`)

-   Manages tree control and form display
-   Loads initial data (tree hierarchy, form schema, initial form data)
-   Listens to tree node selection changes
-   Fetches form data for selected node
-   Handles save/reset actions
-   Manages loading states and error messages

### Data Flow

```
1. Component Init
   ├─> FormDataService.loadFormInitData()
   │   ├─> GET /form/control_form (schema)
   │   ├─> GET /form/hierarchy/employee_section (tree)
   │   └─> GET /control/control.table (initial data)
   │
   ├─> Render Tree with hierarchy
   └─> Render Form with schema + initial data

2. User Selects Node in Tree
   ├─> Tree valueChanges event
   ├─> FormDataService.getFormData(selectedCode)
   │   └─> GET /control/{selectedCode}
   │
   └─> Update form with new data

3. User Clicks Save
   ├─> FormDataService.saveFormData(selectedCode, formValue)
   │   └─> POST /control/{selectedCode}
   │
   └─> Show success/error message
```

---

## Current Implementation Status

### ✅ What's Working

1. **Tree Control**

    - Loads hierarchy from backend
    - Displays tree structure
    - User can select nodes
    - Selection changes trigger data load

2. **Form Display**

    - Schema-driven form rendering via `DynamicFormComponent`
    - Initial data loading and patching
    - Form validation

3. **Loading States**

    - Initial loading indicator
    - Form data loading (with debounce)
    - Success/error messages

4. **Basic CRUD**
    - Save functionality implemented
    - Reset functionality implemented

### ⚠️ What Needs Work

1. **Backend API Endpoints**

    - Need to verify all endpoints exist and work correctly:
        - `GET /form/control_form` - Returns form schema
        - `GET /form/hierarchy/employee_section` - Returns tree hierarchy
        - `GET /control/{code}` - Returns form data for control
        - `POST /control/{code}` - Saves form data

2. **Form Schema Definition**

    - Need a proper form schema that describes the metadata fields
    - Different schemas for different node types? (Control vs Section vs Form)

    [**Answer**]: As mentioned earlier, all the nodes types are treated as a control in the DB and share the same schme.

3. **Tree Hierarchy**

    - Confirm tree structure matches expected format
    - Handle different node types appropriately

4. **Create/Delete Operations**
    - Currently only Save/Reset actions exist
    - May need "Add Child Node" functionality
    - May need "Delete Node" functionality

---

## Design Considerations & Decisions

### 1. Node Type Handling ✅ DECIDED

**Decision**: Single universal schema with conditional field visibility

All controls (BASE, COMPOSITE, SECTION) are stored in one table and edited via one form. The form schema uses `visible_when`, `disabled_when`, and `required_when` expressions to show/hide fields based on the control type and atomic level.

**Rationale**:

-   Simplifies architecture (one form, one API endpoint)
-   Schema expressions handle conditional logic
-   Consistent with the existing "everything is a control" paradigm

**Implementation**: The form schema for `control_form` will include all possible fields, with expressions like:

```json
{
    "key": "source_table",
    "label": "Source Table",
    "type": "select",
    "visibleWhen": "form.atomic_level_code === 'COMPOSITE'"
}
```

### 2. Control Management Workflows ✅ DECIDED

**Decision**: Two distinct workflows via context menu - Create New Controls and Associate Existing Controls

#### 2A. Create New Control Workflow

**Purpose**: Create new SECTION, TAB, GROUP controls for organizing the form structure.

**User Flow**:

1. User right-clicks on a parent control in the tree
2. Context menu shows "Create New Section/Tab/Group" (conditional based on parent node type)
3. **Create Control Modal** opens with minimal fields:
    - Control Code (required, text input with validation)
    - Atomic Level (auto-set to SECTION, readonly)
    - Type (select: SECTION, TAB, GROUP)
    - Label (required)
    - Key (optional, data binding key)
4. User fills form and clicks "Create"
5. Backend creates control in `control` table
6. Backend creates association in `control_group` (parent-child)
7. Tree refreshes to show new control
8. **New control is auto-selected** → Main form loads with control's full metadata
9. User can now add additional details (help text, conditional logic, validation, etc.) via the main form

**Backend Endpoints**:

-   `POST /control` (create new control)
-   `POST /control-group` (create parent-child association)

**Note**: This workflow is ONLY for creating structural/grouping controls (SECTION, TAB, GROUP). BASE controls are auto-generated from database schema.

---

#### 2B. Associate Existing Controls Workflow

**Purpose**: Link existing controls as children of a parent control.

**User Flow**:

1. User right-clicks on a parent control in the tree
2. Context menu shows "Associate Controls" (conditional based on parent node type)
3. **Associate Controls Modal** opens with:
    - List of all available controls (from `control` table)
    - Filter/search by control name (live filtering)
    - Multi-select capability (checkboxes)
    - Shows control code, type, label, and atomic level for each
    - Option to filter by control type or atomic level
4. User selects one or more controls to associate
5. User clicks "Associate" button
6. Creates associations in `control_group` for all selected controls
7. Tree refreshes to show new child nodes
8. First new child is auto-selected

**Backend Endpoint**: `POST /control-group` (bulk create associations)

**Note**: This associates existing controls. Does not create new controls.

### 3. Delete Control Workflow ✅ DECIDED

**Decision**: Delete button in form with business rule validation

**Business Rules**:

-   **BASE Controls**: Can be deleted only if `atomic_level_code = 'BASE'` AND not associated with any form/section (orphaned)
-   **COMPOSITE Controls (TABLE)**: Can delete the association from `control_group`, not the control itself
-   **SECTION Controls**: Can be deleted only if not associated with any forms AND no children exist
-   Always show confirmation dialog before deletion
-   Display clear error message if deletion is not allowed

**Delete Types**:

1. **Delete Association**: Remove from `control_group` (child stays, just unlinked)
2. **Delete Control**: Remove from `control` table (only if atomic level and association rules allow)

**Implementation**:

```typescript
protected readonly formActions: FormAction[] = [
    {
        label: 'Save',
        type: 'submit',
        handler: (form) => this.onSave(form),
        class: 'btn-primary',
    },
    {
        label: 'Delete Association',
        type: 'button',
        handler: () => this.onDeleteAssociation(),
        class: 'btn-warning',
        disabled: () => !this.canDeleteAssociation(),
    },
    {
        label: 'Delete Control',
        type: 'button',
        handler: () => this.onDeleteControl(),
        class: 'btn-danger',
        disabled: () => !this.canDeleteControl(),
    },
    {
        label: 'Reset',
        type: 'reset',
        handler: (form) => this.onReset(form),
        class: 'btn-secondary',
    },
];
```

**Backend Endpoints**:

-   `DELETE /control-group/{parentCode}/{childCode}` (delete association)
-   `DELETE /control/{code}` (delete control with validation)

### 4. Form Schema Structure ✅ DECIDED

**Decision**: Dynamic form driven by `control_form` schema from database

The form schema is retrieved via `GET /form/control_form` and contains all metadata fields for editing controls. The schema itself is stored in the database as controls, demonstrating self-referential metadata.

**Key Schema Sections**:

1. **Basic Information**

    - Control Code (readonly after creation)
    - Atomic Level (select: BASE, COMPOSITE, SECTION)
    - Type (select, options depend on atomic level)
    - Key (data binding key)
    - Label
    - Placeholder
    - Help Text
    - Sort Order

2. **Layout & Display**

    - Width (responsive JSON array)
    - Additional Settings (JSON textarea)

3. **Data Binding** (visible for BASE and COMPOSITE)

    - Source Table
    - Source Column
    - Source Data Type

4. **Domain Logic** (visible for SELECT and similar types)

    - Category Code (domain lookup)
    - Dependent On (parent control key)

5. **Conditional Logic**

    - Visible When (expression)
    - Disabled When (expression)
    - Required When (expression)

6. **Validation** (visible for BASE controls)

    - Is Required
    - Is Readonly
    - Min Value / Max Value
    - Min Length / Max Length
    - Pattern (regex)

7. **Extended Configuration**
    - Properties JSON (type-specific config)

All fields use conditional visibility based on `atomic_level_code` and `type` values.

### 5. Tree Refresh Strategy ✅ DECIDED

**Decision**: Full tree refresh after create/delete operations

**Scenarios**:

-   After creating a new control → Full tree refresh + auto-select new node
-   After deleting a control/association → Full tree refresh + select parent or root
-   After updating control properties → No refresh needed (tree label updated inline if needed)

**Implementation**:

```typescript
private refreshTree(): void {
    const currentSelection = this.selectedNodeCode();

    this.formDataService
        .getTreeHierarchy('employee_section') // Make this dynamic based on context
        .subscribe((hierarchy) => {
            this.treeConfig.update(config => ({
                ...config,
                options: hierarchy
            }));

            // Try to restore selection, or select parent/root
            this.restoreOrSelectParent(currentSelection);
        });
}
```

### 6. Validation & Business Rules ✅ DECIDED

**Client-Side Validations**:

-   Required fields (Code, Type, Label, Atomic Level)
-   Code uniqueness (check via API before saving)
-   Pattern validation for control code (e.g., `^[a-z_][a-z0-9_.]*$`)
-   Min < Max, MinLength < MaxLength
-   Valid JSON for properties_json and additional_settings
-   Expression syntax validation for conditional logic (basic check)

**Server-Side Validations** (enforced by stored procedures):

-   Code uniqueness (database constraint)
-   Referential integrity (foreign keys)
-   Atomic level + type combination validity
-   Deletion rules (check associations, children, form usage)
-   JSON schema validation
-   Expression safety (prevent SQL injection)

**Error Handling**:

-   Display specific error messages from API
-   Highlight invalid fields
-   Prevent form submission if validation fails
-   Show warning before destructive operations

---

## Implementation Plan

### Phase 1: Backend API Development ⚠️ IN PROGRESS

#### Existing Endpoints ✅

1. ✅ `GET /form/{formCode}` - Returns form schema
2. ✅ `GET /form/hierarchy/{hierarchyCode}` - Returns tree hierarchy
3. ✅ `GET /control/{code}` - Returns control data for editing
4. ❌ `POST /control/{code}` - Update control (needs verification/creation)

#### Required New Endpoints ⚠️

1. ⚠️ `POST /control` - Create new control

    - Input: Control metadata (code, type, atomic_level_code, label, etc.)
    - Output: Created control object
    - Validation: Code uniqueness, valid atomic level + type combination

2. ⚠️ `POST /control-group` - Create control-child association

    - Input: `{ control_code, child_control_code, sort_order, data_path?, width? }`
    - Output: Created association
    - Validation: Both controls exist, no circular dependencies

3. ⚠️ `DELETE /control-group/{parentCode}/{childCode}` - Delete association

    - Output: Success message
    - Validation: Association exists

4. ⚠️ `DELETE /control/{code}` - Delete control

    - Output: Success message
    - Validation: Business rules (atomic level, no form associations, no children)
    - Returns specific error if deletion not allowed

5. ⚠️ `PUT /control/{code}` - Update control metadata

    - Input: Partial or full control object
    - Output: Updated control
    - Validation: Code immutable, valid field combinations

6. ⚠️ `GET /control/{code}/can-delete` - Check if control can be deleted
    - Output: `{ canDelete: boolean, reason?: string }`
    - Used for client-side button enabling/disabling

**Backend Implementation**:

All form admin endpoints will be implemented in `backend/form_admin.js` with business logic in Node.js:

```javascript
// backend/form_admin.js

// POST /control - Create new control with validation
// - Validate code uniqueness
// - Validate atomic level + type combination
// - Insert into control table

// DELETE /control/:code - Delete control with business rules
// - Check atomic level
// - Check form associations
// - Check children in control_group
// - Delete if allowed, return error with reason if not

// GET /control/:code/can-delete - Check deletion eligibility
// - Return { canDelete: boolean, reason?: string }

// POST /control-group - Create control associations (bulk)
// - Accept array of child codes
// - Create associations for parent
// - Validate no circular dependencies

// DELETE /control-group/:parent/:child - Delete association
// - Remove entry from control_group table
```

### Phase 2: Form Schema Definition ⚠️

Update the existing `control_form` schema in `db/6.insert_form.sql` to include all metadata fields for editing controls.

**File to Update**: `db/6.insert_form.sql`

**Schema Requirements**:

1. Form entry: `control_form` (should already exist)
2. Controls for each metadata field:
    - `control_form.code` (TEXT, readonly)
    - `control_form.atomic_level_code` (SELECT)
    - `control_form.type` (SELECT)
    - `control_form.key` (TEXT)
    - `control_form.label` (TEXT)
    - ... (all other control table columns)
3. Sections for logical grouping:
    - `control_form.basic_section` - Basic properties
    - `control_form.binding_section` - Data binding
    - `control_form.validation_section` - Validation rules
    - `control_form.logic_section` - Conditional expressions
4. Control-section associations in `control_group`

**Conditional Logic Examples**:

```json
{
    "key": "source_table",
    "visibleWhen": "form.atomic_level_code === 'BASE' || form.atomic_level_code === 'COMPOSITE'",
    "requiredWhen": "form.atomic_level_code === 'BASE'"
}
```

**Action Items**:

-   [ ] Review existing `db/6.insert_form.sql` for control_form
-   [ ] Add/update controls for all metadata fields
-   [ ] Add conditional logic expressions (visibleWhen, requiredWhen, disabledWhen)
-   [ ] Test form rendering with updated schema
-   [ ] Verify conditional logic works correctly

### Phase 3: Frontend CRUD Operations ⚠️

#### 3.1 Update Component (Save Functionality) ✅

Already implemented in `FormAdminControlComponent`:

-   Form submission triggers `saveFormData()`
-   Success/error messaging
-   Form dirty state tracking

\*\*Needs VCreate New Control Workflow ⚠️

**Tree Control Enhancement**:

-   Add context menu support to TreeControlComponent
-   Context menu items (conditional based on node type):
    -   "Create New Section/Tab/Group" - only for COMPOSITE/SECTION parent nodes
    -   "Associate Controls" - only for COMPOSITE/SECTION parent nodes
-   Emit event to parent component with selected node and action type

**Create Control Modal**:

```typescript
class CreateControlDialogComponent {
    parentCode: string;
    formGroup: FormGroup;

    ngOnInit() {
        this.formGroup = this.fb.group({
            code: ['', [Validators.required, Validators.pattern(/^[a-z_][a-z0-9_.]*$/)]],
            atomic_level_code: ['SECTION'], // readonly, auto-set
            type: ['SECTION', Validators.required], // dropdown: SECTION, TAB, GROUP
            label: ['', Validators.required],
            key: [''], // optional
        });
    }

    onSubmit() {
        if (this.formGroup.valid) {
            // Return control data for creation
            return this.formGroup.value;
        }
    }
}
```

**Component Logic**:

```typescript
protected onCreateControl(parentCode: string): void {
    const dialogRef = this.dialog.open(CreateControlDialogComponent, {
        data: { parentCode },
        width: '500px'
    });

    dialogRef.afterClosed().subscribe((newControlData) => {
        if (newControlData) {
            // First create the control, then create the association
            this.formDataService
                .createControl(newControlData)
                .pipe(
                    switchMap((createdControl) =>
                        this.formDataService
                            .createAssociations(parentCode, [createdControl.code])
                            .pipe(map(() => createdControl))
                    )
                )
                .subscribe({
                    next: (createdControl) => {
                        this.successMessage.set(`Control '${createdControl.code}' created successfully`);
                        this.refreshTree();
                        this.selectNode(createdControl.code); // Auto-select so user can add more details
                    },
                    error: (err) => this.error.set('Failed to create control: ' + err.message)
                });
        }
    });
}
```

---

#### 3.3 Associate Existing Controls Workflow ⚠️ (two menu items)

-   [ ] Create CreateControlDialogComponent (modal for creating SECTION/TAB/GROUP controls)
-   [ ] Create AssociateControlsDialogComponent (modal with search + multi-select)
-   [ ] Implement createControl() in FormDataService
-   [ ] Implement loadAllControls() in FormDataService
-   [ ] Implement createAssociations() in FormDataService (accepts array of child codes)
-   [ ] Add tree refresh + auto-select logic for both workflows

---

#### 3.4cript

class AssociateControlsDialogComponent {
parentCode: string;
availableControls: Control[]; // All controls from database
filteredControls: Control[]; // After search/filter
selectedControls: Control[] = []; // User's selection
searchText: string = '';

    ngOnInit() {
        this.loadAvailableControls();
    }

    onSearch(text: string) {
        // Filter availableControls by code, label, type
        this.filteredControls = this.availableControls.filter(
            (c) => c.code.includes(text) || c.label?.includes(text)
        );
    }

    onSelectionChange(control: Control, selected: boolean) {
        // Add/remove from selectedControls
    }

    onConfirm() {
        // Return selectedControls array
    }

}

````

**Component Logic**:

```typescript
protected onAssociateControls(parentCode: string): void {
    const dialogRef = this.dialog.open(AssociateControlsDialogComponent, {
        data: { parentCode },
        width: '600px',
        height: '500px'
    });

    dialogRef.afterClosed().subscribe((selectedControls: Control[]) => {
        if (selectedControls?.length > 0) {
            const childCodes = selectedControls.map(c => c.code);

            this.formDataService
                .createAssociations(parentCode, childCodes)
                .subscribe({
                    next: () => {
                        this.successMessage.set(`${childCodes.length} control(s) associated successfully`);
                        this.refreshTree();
                        this.selectNode(childCodes[0]); // Select first
                    },
                    error: (err) => this.error.set('Failed to associate controls')
                });
        }
    });
}
````

**Action Items**:

-   [ ] Add context menu to TreeControlComponent with conditional display
-   [ ] Create AssociateControlsDialogComponent (modal with search + multi-select)
-   [ ] Implement loadAllControls() in FormDataService
-   [ ] Implement createAssociations() in FormDataService (accepts array of child codes)
-   [ ] Add tree refresh + auto-select logic

#### 3.3 Delete Control/Association Workflow ⚠️

**Delete Association Button**:

```typescript
private onDeleteAssociation(): void {
    const code = this.selectedNodeCode();
    const parentCode = this.getParentCode(code); // Track parent in tree

    if (!code || !parentCode) return;

    if (confirm(`Remove ${code} from ${parentCode}? The control will remain but association will be deleted.`)) {
        this.formDataService
            .deleteAssociation(parentCode, code)
            .subscribe({
                next: () => {
                    this.successMessage.set('Association removed successfully');
                    this.refreshTree();
                },
                error: (err) => this.error.set('Failed to remove association')
            });
    }
}

private canDeleteAssociation(): boolean {
    const code = this.selectedNodeCode();
    return code !== null && this.getParentCode(code) !== null;
}
```

**Delete Control Button**:

```typescript
private onDeleteControl(): void {
    const code = this.selectedNodeCode();
    if (!code) return;

    // Pre-check if deletion is allowed
    this.formDataService.canDeleteControl(code).subscribe({
        next: ({ canDelete, reason }) => {
            if (!canDelete) {
                this.error.set(`Cannot delete: ${reason}`);
                return;
            }

            if (confirm(`Delete control ${code}? This cannot be undone.`)) {
                this.formDataService.deleteControl(code).subscribe({
                    next: () => {
                        this.successMessage.set('Control deleted successfully');
                        this.refreshTree();
                    },
                    error: (err) => this.error.set('Failed to delete control')
                });
            }
        }
    });
}

private canDeleteControl(): boolean {
    // Enable button, validation happens on click
    return this.selectedNodeCode() !== null;
}
```

**Action Items**:

-   [ ] Add deleteAssociation() to FormDataService
-   [ ] Add deleteControl() to FormDataServ for association deletionice
-   [ ] Add canDeleteControl() to FormDataService
-   [ ] Update form actions to include delete buttons
-   [ ] Implement confirmation dialogs
-   [ ] Track parent code in tree selection

### Phase 4: Enhanced Features 🔮 FUTURE

1. **Context Menu Enhancements**

    - Copy/Paste control
    - Duplicate control
    - Move control to different parent

2. **Drag-and-Drop Reordering**

    - Allow dragging tree nodes to reorder
    - Update sort_order in control_group
    - Visual drop indicators

3. **Form Dirty State & Navigation Guards**

    - Track form changes
    - Warn before navigation if unsaved
    - Auto-save option

4. **Preview Tab**

    - Add tab component to form admin
    - Tabs: "Edit Metadata" | "Preview Form"
    - Preview tab renders the form based on current control hierarchy
    - Real-time preview as user makes changes

5. **Advanced Search & Filters**

    - Search controls by code/label
    - Filter by type, atomic level
    - Show/hide different control types in tree

6. **Undo/Redo**
    - Track operation history
    - Undo last create/delete/update
    - Leverage temporal tables for restore

### Phase 5: Validation & Error Handling 🔮 FUTURE

1. **Enhanced Client-Side Validation**

    - Real-time code uniqueness check (debounced API call)
    - Expression syntax validator
    - JSON schema validation for properties_json
    - Show field-level error messages

2. **Server Response Mapping**

    - Map SQL Server errors to user-friendly messages
    - Display validation errors in form
    - Highlight problematic fields

3. **Business Rule Enforcement**

    - Prevent circular dependencies in control hierarchy
    - Validate atomic level + type combinations
    - Check data type compatibility for binding

4. **Better Error UX**
    - Toast notifications for success/error
    - Error summary panel
    - Inline field errors
    - Retry failed operations

---

## Current Frontend Implementation Analysis

### What's Already Built ✅

**FormAdminControlComponent** (`form-admin-control.component.ts`):

-   ✅ Tree control with hierarchy loading
-   ✅ Dynamic form rendering based on schema
-   ✅ Node selection handling
-   ✅ Form data loading on selection change
-   ✅ Save functionality with API integration
-   ✅ Reset functionality
-   ✅ Loading states (initial + data)
-   ✅ Success/error messaging
-   ✅ Reactive programming patterns (signals, rxjs)
-   ✅ Debounced data loading to prevent flickering
-   ✅ Form ready event handling

**FormDataService** (`form-data.service.ts`):

-   ✅ `getFormSchema(formCode)` - Get form schema
-   ✅ `getTreeHierarchy(hierarchyCode)` - Get tree structure
-   ✅ `getFormData(controlCode)` - Get control data
-   ✅ `saveFormData(controlCode, data)` - Save control data
-   ✅ `loadFormInitData()` - Parallel loading with forkJoin
-   ⚠️ `createFormData(data)` - Exists but needs to be adapted for controls
-   ⚠️ `deleteFormData(controlCode)` - Exists but needs business rule integration

### What Needs to Be Built ⚠️

**Backend APIs**:

-   ⚠️ `PUT /control/{code}` - Update control endpoint
-   ⚠️ `POST /control-group` - Create associations (bulk - accepts array of child codes)
-   ⚠️ `DELETE /control-group/{parent}/{child}` - Delete association
-   ⚠️ `DELETE /control/{code}` - Delete control with business rules
-   ⚠️ `GET /control/{code}/can-delete` - Check deletion eligibility
-   ⚠️ `GET /controls` - Get all controls for association dialog

**Note**: All endpoints will be in `backend/form_admin.js`. No stored procedures - all logic in Node.js.

**Frontend Components**:

-   ⚠️ CreateControlDialogComponent - Modal for creating new SECTION/TAB/GROUP controls (minimal fields)
-   ⚠️ AssociateControlsDialogComponent - Modal for selecting multiple controls to associate
-   ⚠️ Context menu support in TreeControlComponent (conditional display, two menu items)
-   ⚠️ Confirmation dialog component/service

**Frontend Logic**:

-   ⚠️ Create new control workflow (dialog + create API + associate API + tree refresh + auto-select)
-   ⚠️ Associate controls workflow (dialog with search + multi-select + API calls + tree refresh)
-   ⚠️ Delete association functionality
-   ⚠️ Delete control functionality with validation
-   ⚠️ Tree parent tracking for delete association
-   ⚠️ Tree refresh with selection restore
-   ⚠️ Form action buttons for delete operations
-   ⚠️ Fix hardcoded tree root to use form_code from URL

**Database**:

-   ⚠️ Update `db/6.insert_form.sql` with complete `control_form` schema
-   ⚠️ Add conditional logic expressions in control_form fields

---

## Technical Architecture

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      Form Admin Component                     │
├─────────────────┬───────────────────────┬───────────────────┤
│                 │                       │                    │
│  Tree Control   │   Form Area           │   Actions          │
│                 │                       │                    │
│  • Load tree    │   • Load schema       │   • Save           │
│  • Select node  │   • Load data         │   • Reset          │
│  • Context menu │   • Render form       │   • Delete Assoc   │
│                 │   • Validation        │   • Delete Control │
│                 │                       │   • Create Child   │
└────────┬────────┴──────────┬────────────┴───────┬───────────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                     ┌───────▼───────┐
                     │ FormDataService│
                     │   (HTTP)       │
                     └───────┬────────┘
                             │
         ┌───────────────────┼────────────────────┐
         │                   │                    │
    ┌────▼─────┐      ┌──────▼──────┐     ┌──────▼──────┐
    │ GET APIs │      │ POST/PUT    │     │ DELETE APIs │
    │          │      │ APIs        │     │             │
    │ • Schema │      │ • Create    │     │ • Control   │
    │ • Tree   │      │ • Update    │     │ • Assoc     │
    │ • Data   │      │ • Associate │     │             │
    └────┬─────┘      └──────┬──────┘     └──────┬──────┘
         │                   │                    │
         └───────────────────┼────────────────────┘
                             │
                      ┌──────▼──────┐
                      │   Backend   │
                      │  (Node.js)  │
                      └──────┬──────┘
                             │
                      ┌──────▼──────┐
                      │  SQL Server │
                      │             │
                      │  • control  │
                      │  • control_ │
                      │    group    │
                      │  • form     │
                      └─────────────┘
```

### Component Communication

```typescript
// FormAdminControlComponent responsibilities:
class FormAdminControlComponent {
    // State management
    private selectedNodeCode: WritableSignal<string | null>;
    private schema: WritableSignal<FormSchema | null>;
    private initialValues: WritableSignal<Record<string, any>>;
    private isLoading: WritableSignal<boolean>;
    private error: WritableSignal<string | null>;

    // Lifecycle
    ngOnInit() {
        this.loadInitialFormData(); // Schema + Tree + Initial data
    }

    // Tree interactions
    private setupTreeSelectionListener() {
        // Listen to tree selection changes
        // Load control data for selected node
    }

    private onContextMenu(node: TreeNode, action: string) {
        // Handle: 'add-child', 'delete-assoc', etc.
    }

    // CRUD operations
    private onSave(form: FormGroup) {
        /* Update control */
    }
    private onReset(form: FormGroup) {
        /* Reset to initial values */
    }
    private onCreate(parentCode: string) {
        /* Open create dialog */
    }
    private onDeleteAssociation() {
        /* Delete from control_group */
    }
    private onDeleteControl() {
        /* Delete from control table */
    }

    // Tree management
    private refreshTree() {
        /* Reload hierarchy, restore selection */
    }
    private selectNode(code: string) {
        /* Programmatic selection */
    }
}
```

### Service Methods

```typescript
class FormDataService {
    // Existing methods ✅
    getFormSchema(formCode: string): Observable<FormSchema>;
    getTreeHierarchy(hierarchyCode: string): Observable<TreeOption[]>;
    getFormData(controlCode: string): Observable<any>;
    createControl(control: CreateControlRequest): Observable<Control>; // Create new SECTION/TAB/GROUP
    saveFormData(controlCode: string, data: any): Observable<any>;
    loadFormInitData(formCode, hierarchyCode, initialCode): Observable<FormInitData>;

    // New methods to implement ⚠️
    loadAllControls(): Observable<Control[]>; // Get all controls for association dialog
    updateControl(code: string, control: UpdateControlRequest): Observable<Control>;
    deleteControl(code: string): Observable<DeleteResult>;
    canDeleteControl(code: string): Observable<CanDeleteResult>;

    createAssociations(
        parentCode: string,
        childCodes: string[], // Array of child codes for bulk association
        options?: AssociationOptions
    ): Observable<AssociationResult>;
    deleteAssociation(parentCode: string, childCode: string): Observable<DeleteResult>;
    updateAssociation(
        parentCode: string,
        childCode: string,
        options: AssociationOptions
    ): Observable<ControlGroup>;
}
```

---

## Summary & Next Actions

### Decisions Made ✅

1. ✅ Single universal form schema with conditional visibility
2. ✅ Context menu for creating child controls
3. ✅ Separate delete actions: association vs. control
4. ✅ Full tree refresh after create/delete operations
5. ✅ Schema-driven form from database (`control_form`)
6. ✅ Business rules enforced server-side via stored procedures

### Immediate Action Items (Priority Order)

**Phase 1A: Backend API Setup** (1-2 days)

**Create new file**: `backend/form_admin.js`

1. `PUT /control/{code}` - Update control metadata
2. `POST /control-group` - Create control associations (accepts array of child codes for bulk)
3. `DELETE /control-group/{parent}/{child}` - Delete single association
4. `DELETE /control/{code}` - Delete control with business rule validation
5. `GET /control/{code}/can-delete` - Check if control can be deleted
6. `GET /controls` - Get all controls for association dialog

**Business Logic (in Node.js)**:

-   Validate code uniqueness
-   Validate atomic level + type combinations
-   Check circular dependencies in control_group
-   Enforce deletion rules based on atomic level and associations
-   Return meaningful error messages

**Phase 1B: Database Schema** (1 day)

**File to update**: `db/6.insert_form.sql`

1. Review existing `control_form` schema in the file
2. Add/update controls for all metadata fields (code, atomic_level_code, type, key, label, etc.)
3. Add conditional logic expressions (visibleWhen, requiredWhen, disabledWhen) for field visibility
4. Create logical sections (basic_section, binding_section, validation_section, logic_section)
5. Test form rendering with updated schema
   :
    - createControl() - Create new SECTION/TAB/GROUP controls
    - loadAllControls() - Get all controls for association dialog
    - createAssociations() - Bulk associate controls
    - deleteControl(), canDeleteControl(), deleteAssociation()
6. Create CreateControlDialogComponent - minimal form for new SECTION/TAB/GROUP controls
7. Create AssociateControlsDialogComponent - search + multi-select for existing controls
8. Add context menu to TreeControlComponent with two options (conditional display)
9. Implement create new control workflow (create + associate + refresh + auto-select)
10. Implement associate controls workflow (multi-select + associate + refresh)
11. Add delete buttons and logic (delete association + delete control with validation)
12. Implement tree refresh with selection restore
13. Add confirmation dialogs
14. Add delete buttons and logic (delete association + delete control)
15. Implement tree refresh with selection restore
16. Add confirmation dialogs
17. Fix hardcoded tree root - use form_code from URL parameter

**Phase 3: Testing & Polish** (1-2 days)

1. End-to-end testing of CRUD operations
2. Error handling refinement
3. Loading state optimization
4. User feedback (toasts, messages)
5. Documentation

### Out of Scope (For Now) 🔮

-   Permissions/security
-   Import/export functionality
-   Multi-tenancy
-   Change history UI (temporal tables work server-side)
-   Preview tab (future enhancement)
-   Drag-and-drop reordering
-   Advanced search/filters

---

## Implementation Decisions - Finalized ✅

All design questions have been answered:

1. **Backend Stack**: ✅ Node.js + SQL Server. All business logic in Node.js (no stored procedures). Form admin endpoints in `backend/form_admin.js`.

2. **Control Code Format**: ✅ Not enforced in Form Admin. BASE controls are auto-generated from database schema via separate utility. Form Admin is for creating sections and final forms only.

3. **Context Menu UX**: ✅ Conditional based on node type. "Associate Controls" option only shown for COMPOSITE/SECTION controls.

4. **Delete Behavior**: ✅ No orphan warnings needed. Separate bulk cleanup utility will handle orphaned controls outside Form Admin scope.

5. **Form Validation**: ✅ Show meaningful error message when insert fails. No real-time validation during typing.

6. **Tree Root**: ✅ Should be dynamic from URL `form_code` parameter, not hardcoded. Current hardcoded value is incorrect.

7. **Create Dialog**: ✅ Modal dialog with multi-select capability. Shows all available controls with filter/search. Has "Create" and "Cancel" buttons.

---

## Ready to Implement! 🚀

**Next Steps**:

1. Create `backend/form_admin.js` with all required endpoints
2. Update `db/6.insert_form.sql` with complete control_form schema
3. Build AssociateControlsDialogComponent with multi-select
4. Add context menu to TreeControlComponent
5. Update FormDataService with new methods
6. Fix hardcoded tree root to use URL parameter

**Estimated Timeline**: 3-4 days for full implementation and testing.

---

## Critical Review & Open Questions

### Document Review Summary

The design document now covers:

-   ✅ Two distinct workflows: Create New Controls (SECTION/TAB/GROUP) and Associate Existing Controls
-   ✅ Database schema with control and control_group tables
-   ✅ Context menu with conditional display based on node type
-   ✅ Complete CRUD operations (Create, Read, Update, Delete + Associate/Disassociate)
-   ✅ Backend API endpoints in `backend/form_admin.js` with Node.js logic (no stored procedures)
-   ✅ Form schema definition via `db/6.insert_form.sql`
-   ✅ Tree refresh strategies and loading states
-   ✅ Business rules for deletion based on atomic level

### Critical Clarification Questions

#### 1. Tree Root & URL Parameter

**Current Issue**: Component has hardcoded `'employee_section'` as tree root.

**Questions**:

-   What should the URL structure be? `/form-admin/:formCode`?
-   Should the tree root be the form itself, or a specific section within the form?
-   Example: For `employee_form`, should tree root be:
    -   Option A: `employee_form` (shows all sections of the form)
    -   Option B: A root section like `employee_section` (shows children of that section)
    -   Option C: Dynamic based on form configuration

**Impact**: Affects how we load tree hierarchy and what controls are editable.

---

## 🎯 FINALIZED DESIGN DECISIONS

All questions have been answered. Here are the finalized decisions:

### 1. Tree Root & URL Parameter ✅

-   **URL Structure**: `/form-admin/:formCode`
-   **Tree Root**: The form itself (dynamically loaded from URL parameter)
-   **Example**: `/form-admin/employee_form` loads `employee_form` as tree root

### 2. Context Menu Display Rules ✅

-   **Show context menu on**: All controls EXCEPT BASE controls
-   **Menu Items**: Both "Create New Section/Tab/Group" and "Associate Controls" available
-   **Nesting**: Fully flexible - admins can create any nesting structure they want

### 3. Control Type Selection ✅

-   **Dropdown Options**: Show all three types (SECTION, TAB, GROUP) always
-   **Restrictions**: None - admin decides the structure
-   **Validation**: Only code pattern validation (`^[a-z_][a-z0-9_.]*$`)

### 4. Associate Controls Filter Logic ✅

-   **Display**: Show ALL controls in database
-   **Filter Options**: By type and atomic level (user-initiated)
-   **Already Associated**: Show all controls, including those with existing associations
-   **Circular Dependencies**: Check on backend only

### 5. Control Code Naming ✅

-   **Format**: Free-form with pattern validation
-   **Auto-suggestion**: Not implemented initially
-   **Validation**: `^[a-z_][a-z0-9_.]*$` pattern only

### 6. Backend Endpoint Scope ✅

-   **`POST /control`**: Can accept any control type
-   **UI Restriction**: Form Admin only exposes SECTION/TAB/GROUP creation
-   **No Backend Validation**: To prevent BASE control creation (UI handles it)

### 7. Sort Order Management ✅

-   **Bulk Association**: Auto-increment based on current max sort_order
-   **Reordering**: Via drag-drop (future) or edit sort_order field in main form
-   **Default Behavior**: Sequential ordering for new associations

### 8. Delete Business Rules ✅

**Critical Clarification**:

-   **"Delete BASE Control"** = Remove association from `control_group` table ONLY (control stays in `control` table)
-   **"Delete SECTION/GROUP/TAB Control"** = Remove from `control` table if:
    -   Not associated with any other control (no parent-child relationships)
    -   Has no children of its own

**Implementation**:

```javascript
// Backend validation logic
canDeleteControl(code) {
    const control = getControl(code);

    if (control.atomic_level_code === 'BASE') {
        // BASE controls: Always allow "deletion" (removes association only)
        return { canDelete: true, deletesAssociation: true };
    }

    if (['SECTION', 'GROUP', 'TAB'].includes(control.type)) {
        // Check if has any parent associations
        const parentCount = countParentAssociations(code);
        // Check if has any children
        const childCount = countChildAssociations(code);

        if (parentCount > 0 || childCount > 0) {
            return {
                canDelete: false,
                reason: `Control has ${parentCount} parent(s) and ${childCount} child(ren)`
            };
        }

        return { canDelete: true, deletesControl: true };
    }

    return { canDelete: false, reason: 'Unknown control type' };
}
```

### 9. Form Schema Field Rules ✅

-   **Created Controls**: Only SECTION/TAB/GROUP types
-   **Not Applicable**: `source_table`, `source_column`, `source_data_type` (hidden via expressions)
-   **Readonly Fields**: None - all fields editable
-   **Required Fields**: Enforced via expressions in schema (code, type, label)
-   **Server Validation**: Future scope - client-side only for now

### 10. Error Handling & UX ✅

-   **Notifications**: Implement proper toast/notification service (not alert/confirm)
-   **Error Display**: Global error panel + inline field errors
-   **Loading States**: Generic spinner component for long operations
-   **Success Feedback**: Toast notifications with auto-dismiss

**To Implement**:

-   Toast notification service/component
-   Global error panel component
-   Loading spinner component with overlay

### 11. Testing Strategy ✅

-   **Scope**: Out of scope for initial implementation
-   **Future**: Add E2E tests after core functionality is stable

### 12. Performance Strategy ✅

-   **Initial Approach**: Load all data upfront
-   **Optimization**: Only if performance issues arise
-   **Future Enhancements**: Virtual scrolling, pagination, lazy loading

---

---

## 🚀 READY FOR IMPLEMENTATION

### Implementation Order

**Step 1: Backend Foundation** (Day 1)

1. Create `backend/form_admin.js` with all endpoints
2. Implement business logic for CRUD operations
3. Add delete validation logic (association vs control deletion)
4. Test endpoints with Postman/similar

**Step 2: Database Schema** (Day 1-2)

1. Update `db/6.insert_form.sql` with complete `control_form` schema
2. Add all metadata fields with conditional expressions
3. Create logical sections for field grouping
4. Test schema rendering in existing Form Admin component

**Step 3: Shared Components** (Day 2)

1. Create toast notification service
2. Create loading spinner component
3. Create confirmation dialog service
4. Test components in isolation

**Step 4: Dialog Components** (Day 2-3)

1. CreateControlDialogComponent - minimal form for SECTION/TAB/GROUP
2. AssociateControlsDialogComponent - multi-select with search/filter
3. Test dialogs with mock data

**Step 5: Context Menu & Integration** (Day 3)

1. Add context menu to TreeControlComponent
2. Conditional display logic (hide for BASE controls)
3. Wire up menu items to dialog components
4. Test menu interactions

**Step 6: Form Admin Component Updates** (Day 3-4)

1. Update FormDataService with new methods
2. Implement create control workflow
3. Implement associate controls workflow
4. Update delete logic (association vs control)
5. Fix hardcoded tree root - use URL parameter
6. Add error handling with toast notifications
7. Add loading states

**Step 7: Testing & Polish** (Day 4)

1. End-to-end workflow testing
2. Error scenario testing
3. UX refinements
4. Documentation updates

### Key Implementation Notes

**Backend (`backend/form_admin.js`)**:

```javascript
// Critical: Delete logic distinction
DELETE /control/:code
- If BASE control: Delete from control_group only (association)
- If SECTION/TAB/GROUP: Check no parents/children, then delete from control table

// Context menu should filter
GET /controls
- Return all controls
- Frontend filters BASE controls from context menu display
```

**Frontend Context Menu Logic**:

```typescript
canShowContextMenu(node: TreeNode): boolean {
    return node.atomic_level_code !== 'BASE';
}
```

**Tree Root Loading**:

```typescript
// Get formCode from URL
const formCode = this.route.snapshot.paramMap.get('formCode');
this.formDataService.getTreeHierarchy(formCode).subscribe(...);
```

**Delete Button Logic**:

```typescript
// Update button labels based on control type
getDeleteButtonLabel(): string {
    const control = this.selectedControl();
    if (control?.atomic_level_code === 'BASE') {
        return 'Remove Association';
    }
    return 'Delete Control';
}
```

### Validation Summary

**Client-Side** (Implemented Now):

-   Required fields (code, type, label)
-   Code pattern validation
-   JSON format validation (basic)

**Server-Side** (Future):

-   Atomic level + type combination validation
-   Expression syntax validation
-   Comprehensive business rules

### Out of Scope

-   Advanced validation (server-side)
-   Testing framework and E2E tests
-   Performance optimizations
-   Drag-and-drop reordering
-   Undo/redo functionality
-   Preview tab
-   Security/permissions

---

## ✅ DESIGN APPROVED - PROCEED WITH IMPLEMENTATION

All questions answered. All decisions finalized. Ready to code!

**Start with**: Backend API endpoints (`backend/form_admin.js`)

**Estimated Completion**: 4 days for full feature set
