# Group Control - Recursive Nesting

## Overview

The form builder now supports **recursive group controls**, allowing sections to be treated as groups and controls to contain nested controls. This enables a unified, hierarchical form structure.

**New in this version:**

-   Case-insensitive control types (both `"text"` and `"TEXT"` work)
-   Sections can have explicit `type: "GROUP"` property
-   Support for string width notation like `"[12]"`
-   Direct validation properties (`required`, `readonly`, `minLength`, `maxLength`, etc.)

## Key Concepts

### 1. Sections as Groups

Sections with a `key` property create a **nested FormGroup** in the reactive form structure. Optionally, sections can have an explicit `type: "GROUP"` property:

```json
{
    "sections": [
        {
            "key": "employee",
            "type": "GROUP",
            "label": "Employee Information",
            "width": "[12]",
            "controls": [
                { "key": "FirstName", "type": "TEXT", "label": "First Name", "required": true },
                { "key": "LastName", "type": "TEXT", "label": "Last Name", "required": true }
            ]
        }
    ]
}
```

This creates a form structure like:

```typescript
{
  employee: FormGroup {
    FirstName: FormControl,
    LastName: FormControl
  }
}
```

And data structure:

```json
{
    "employee": {
        "FirstName": "John",
        "LastName": "Doe"
    }
}
```

### 2. Group Controls

Any control with `type: 'group'` (or `type: 'GROUP'`) can contain nested controls (which can also be groups):

```json
{
    "key": "address",
    "type": "GROUP",
    "label": "Address Information",
    "required": false,
    "readonly": false,
    "controls": [
        { "key": "Street", "type": "TEXT", "label": "Street", "maxLength": 255 },
        { "key": "City", "type": "TEXT", "label": "City", "maxLength": 100 },
        {
            "key": "location",
            "type": "GROUP",
            "label": "Geographic Coordinates",
            "controls": [
                { "key": "Latitude", "type": "NUMBER", "label": "Latitude" },
                { "key": "Longitude", "type": "NUMBER", "label": "Longitude" }
            ]
        }
    ]
}
```

### 3. Recursive Structure

The system supports unlimited nesting depth:

```
Form
├── Section (Group)
│   ├── Control (Text)
│   ├── Control (Number)
│   └── Group Control
│       ├── Control (Text)
│       └── Group Control
│           ├── Control (...)
│           └── ...
```

## Implementation Details

### Type Normalization

All control types are normalized to lowercase internally:

-   `"TEXT"` → `"text"`
-   `"NUMBER"` → `"number"`
-   `"GROUP"` → `"group"`
-   etc.

This allows schemas to use any casing convention.

### Validation Properties

Controls support both old-style and new-style validation:

**New style (direct properties):**

```json
{
    "key": "Email",
    "type": "TEXT",
    "required": true,
    "minLength": 5,
    "maxLength": 255
}
```

**Old style (validators object):**

```json
{
    "key": "email",
    "type": "text",
    "validators": {
        "required": true,
        "minLength": 5,
        "maxLength": 255
    }
}
```

Both styles are supported and can be mixed.

### Width Notation

Width can be specified as:

-   Number: `12`
-   Array: `[12, 6, 4]` (mobile, tablet, desktop)
-   String: `"[12]"` or `"[12, 6, 4]"`

### FormGeneratorService

The `toFormGroup()` method now:

1. **Treats sections with keys as groups**: Creates nested FormGroups for sections with keys
2. **Handles group controls recursively**: The `buildControlsInStructure()` method detects `type: 'group'` and calls `createNestedGroup()`
3. **Maps control keys to data paths**: Maintains a `controlMap` for efficient control lookup

Key methods:

-   `toFormGroup(schema)`: Entry point - builds the entire form structure
-   `buildControlsInStructure(controls, structure, controlMap, parentPath)`: Recursively processes controls
-   `createNestedGroup(structure, path, control, controlMap)`: Creates nested FormGroup for group controls
-   `resolveDataPath(control, parentPath)`: Computes the full data path for a control
-   `patchControlsRecursively(group, data, controls, parentPath)`: Recursively patches data to form (handles tables and groups)

### DynamicControlComponent

The component now handles the `'group'` type:

```typescript
@case ('group') {
  <div class="group-control">
    @if (config.label) {
      <fieldset class="group-fieldset">
        <legend>{{ config.label }}</legend>
        <div class="group-controls">
          @for (childControl of getGroupControls(); track childControl.key) {
            <app-dynamic-control [config]="childControl" [group]="group">
            </app-dynamic-control>
          }
        </div>
      </fieldset>
    }
  </div>
}
```

-   Renders child controls recursively
-   Uses `<fieldset>` and `<legend>` for visual grouping when label is present
-   Maintains 12-column grid layout for responsive design

## Usage Examples

### Example 1: Real-World Employee Form (from form-sample.json)

```json
{
    "code": "employee_form",
    "version": "1.0.0",
    "label": "Employee Form",
    "sections": [
        {
            "label": "Employee Information",
            "key": "employee",
            "type": "GROUP",
            "width": "[12]",
            "controls": [
                {
                    "code": "employee.id",
                    "key": "Id",
                    "type": "TEXT",
                    "label": "Id",
                    "required": true,
                    "minLength": 2,
                    "maxLength": 50
                },
                {
                    "code": "employee.first_name",
                    "key": "FirstName",
                    "type": "TEXT",
                    "label": "First Name",
                    "required": true,
                    "minLength": 2,
                    "maxLength": 100
                },
                {
                    "code": "employee_address_section",
                    "key": "address",
                    "type": "GROUP",
                    "label": "Address Information",
                    "controls": [
                        {
                            "key": "Street",
                            "type": "TEXT",
                            "label": "Street",
                            "maxLength": 255
                        },
                        {
                            "key": "City",
                            "type": "TEXT",
                            "label": "City",
                            "maxLength": 100
                        }
                    ]
                }
            ]
        }
    ]
}
```

**Data Structure:**

```json
{
    "employee": {
        "Id": "EMP_001",
        "FirstName": "John",
        "address": {
            "Street": "123 Main St",
            "City": "Springfield"
        }
    }
}
```

### Example 2: Simple Section with Key

```json
{
    "code": "USER_001",
    "version": "1.0",
    "label": "User Profile",
    "sections": [
        {
            "key": "account",
            "label": "Account Information",
            "controls": [
                { "key": "username", "type": "text", "label": "Username" },
                { "key": "email", "type": "text", "label": "Email" }
            ]
        }
    ]
}
```

**Data Structure:**

```json
{
    "account": {
        "username": "jdoe",
        "email": "jdoe@example.com"
    }
}
```

### Example 2: Nested Groups

```json
{
    "key": "contact",
    "type": "group",
    "label": "Contact Information",
    "controls": [
        { "key": "phone", "type": "text", "label": "Phone" },
        {
            "key": "address",
            "type": "group",
            "label": "Address",
            "controls": [
                { "key": "street", "type": "text", "label": "Street" },
                { "key": "city", "type": "text", "label": "City" },
                { "key": "zip", "type": "text", "label": "ZIP Code" }
            ]
        }
    ]
}
```

**Data Structure:**

```json
{
    "contact": {
        "phone": "555-1234",
        "address": {
            "street": "123 Main St",
            "city": "Springfield",
            "zip": "12345"
        }
    }
}
```

### Example 3: Mixed with Table Controls

```json
{
    "key": "employee",
    "type": "group",
    "label": "Employee Details",
    "controls": [
        { "key": "name", "type": "text", "label": "Name" },
        {
            "key": "addresses",
            "type": "table",
            "label": "Addresses",
            "controls": [
                { "key": "street", "type": "text", "label": "Street" },
                { "key": "city", "type": "text", "label": "City" }
            ]
        }
    ]
}
```

**Data Structure:**

```json
{
    "employee": {
        "name": "John Doe",
        "addresses": [
            { "street": "123 Main St", "city": "Springfield" },
            { "street": "456 Elm St", "city": "Shelbyville" }
        ]
    }
}
```

## Benefits

1. **Logical Organization**: Group related fields naturally
2. **Data Structure Alignment**: Form structure mirrors data structure
3. **Reusability**: Define reusable group controls
4. **Flexibility**: Mix groups, tables, and base controls freely
5. **Validation Scoping**: Apply validation rules at group level
6. **Visual Hierarchy**: Automatic visual grouping with fieldsets

## Migration Notes

### Breaking Changes

-   **Sections with keys now create nested data**: If your existing schemas have sections with `key` properties, the data structure will change from flat to nested
-   Update your backend/data handling to expect nested structures

### Backward Compatibility

-   **Sections without keys remain flat**: If a section doesn't have a `key`, controls are added to the root level (backward compatible)
-   **Existing control types unaffected**: Text, number, select, checkbox, table controls work as before

### Migration Steps

1. **Review existing schemas**: Check if any sections have `key` properties
2. **Update data handling**: Adjust form submission and data patching to handle nested structures
3. **Test thoroughly**: Verify that form data flows correctly with the new structure
4. **Update dataPath overrides**: If you're using `dataPath` to flatten structure, review if still needed

## Future Enhancements

-   Group-level validation rules
-   Conditional rendering of entire groups
-   Group templates for reuse across forms
-   Dynamic addition/removal of groups (similar to table rows)
