# Table Column Visibility & Width Control

This document explains how to configure column visibility and widths in table controls using `additionalSettings`.

## Overview

The table control now supports:

-   **Showing specific columns** via `visibleColumns` array
-   **Hiding columns** via `hiddenColumns` array
-   **Combined visibility control** using both `visibleColumns` and `hiddenColumns`
-   **Custom column widths** via `columnWidths` object
-   **Smart proportional width calculation** based on control widths

## Configuration Location

Settings are stored in `control_group.additional_settings` as JSON:

```sql
-- Example: In control_group table
UPDATE control_group
SET additional_settings = '{
  "visibleColumns": ["first_name", "last_name", "email"],
  "hiddenColumns": ["internal_notes"],
  "columnWidths": {
    "first_name": "30%"
  }
}'
WHERE control_code = 'employee_table'
  AND child_control_code IN (SELECT code FROM control WHERE ...);
```

## TypeScript Interface

```typescript
interface TableAdditionalSettings {
    visibleColumns?: string[]; // Column keys to show (if present, only these are visible)
    hiddenColumns?: string[]; // Column keys to hide
    columnWidths?: {
        [columnKey: string]: string; // e.g., "25%", "200px"
    };
    minColumnWidth?: string; // e.g., "100px" (future use)
    responsiveBreakpoint?: number; // When to switch to mobile view (future use)
}
```

## Column Visibility Logic

The component applies visibility settings in the following priority:

### 1. If `visibleColumns` is specified:

-   Show **ONLY** the columns listed in `visibleColumns`
-   If `hiddenColumns` is also specified, remove hidden columns from the visible list
-   All other columns are hidden

### 2. If only `hiddenColumns` is specified:

-   Show **ALL** columns except those listed in `hiddenColumns`

### 3. If both are empty or missing:

-   Show **ALL** columns (default behavior)

### Examples:

```typescript
// Scenario 1: Only visible columns
{
  "visibleColumns": ["name", "email", "status"]
}
// Result: Shows only name, email, status

// Scenario 2: Visible + Hidden (hidden takes precedence)
{
  "visibleColumns": ["name", "email", "status", "notes"],
  "hiddenColumns": ["notes"]
}
// Result: Shows name, email, status (notes is removed)

// Scenario 3: Only hidden columns
{
  "hiddenColumns": ["id", "internal_notes"]
}
// Result: Shows all columns except id and internal_notes

// Scenario 4: Empty or missing
{}
// Result: Shows all columns
```

## How Width Calculation Works

### Algorithm

1. **Filter columns based on visibility settings** (visibleColumns and/or hiddenColumns)
2. **Separate explicit vs auto columns**:
    - Explicit: columns with `columnWidths` override
    - Auto: columns without override (use control.width)
3. **Calculate remaining space** (100% - explicit widths)
4. **Distribute proportionally** among auto columns based on their `control.width` values

### Example

**Controls Definition:**

```json
[
    { "key": "id", "width": [12, 6, 2] },
    { "key": "name", "width": [12, 6, 4] },
    { "key": "email", "width": [12, 6, 3] },
    { "key": "status", "width": [12, 6, 3] }
]
```

**Additional Settings:**

```json
{
    "hiddenColumns": ["id"],
    "columnWidths": {
        "name": "50%"
    }
}
```

**Calculated Widths:**

-   `id`: Hidden (not rendered)
-   `name`: **50%** (explicit override)
-   `email`: **25%** (3/6 of remaining 50%)
-   `status`: **25%** (3/6 of remaining 50%)

### Width Parsing

The `control.width` field supports multiple formats:

-   **Number**: `12` → 12 units
-   **Array**: `[12, 6, 4]` → 4 units (last element = desktop breakpoint)
-   **JSON String**: `"[12, 6, 4]"` → parsed as array

## Usage Examples

### Example 1: Hide Columns Only

```json
{
    "hiddenColumns": ["created_at", "updated_at", "internal_id"]
}
```

All visible columns use proportional widths from `control.width`.

### Example 2: Custom Width for One Column

```json
{
    "columnWidths": {
        "actions": "120px"
    }
}
```

Actions column gets fixed 120px, others share remaining space proportionally.

### Example 3: Multiple Overrides

```json
{
    "hiddenColumns": ["id"],
    "columnWidths": {
        "first_name": "25%",
        "last_name": "25%",
        "email": "30%"
    }
}
```

Specified columns get exact widths, remaining columns share leftover 20%.

### Example 4: Full Control

```json
{
    "hiddenColumns": ["internal_notes", "legacy_field"],
    "columnWidths": {
        "name": "40%",
        "email": "35%",
        "status": "25%"
    }
}
```

Complete control over all visible columns.

## SQL Update Examples

### Hide Columns in Employee Table

```sql
UPDATE dbo.control_group
SET additional_settings = '{"hiddenColumns": ["employee_id", "ssn"]}'
WHERE control_code = 'employee_table';
```

### Set Custom Column Widths

```sql
UPDATE dbo.control_group
SET additional_settings = '{
  "columnWidths": {
    "first_name": "25%",
    "last_name": "25%",
    "email": "30%",
    "actions": "20%"
  }
}'
WHERE control_code = 'employee_table';
```

### Combined Configuration

```sql
UPDATE dbo.control_group
SET additional_settings = '{
  "hiddenColumns": ["internal_id", "created_by"],
  "columnWidths": {
    "name": "40%",
    "department": "30%"
  }
}'
WHERE control_code = 'employee_table';
```

## Frontend Implementation

The table component automatically:

1. Reads `config.additionalSettings`
2. Filters `visibleColumns()` computed property
3. Calculates widths via `calculateColumnWidths()`
4. Applies widths using `[style.width]` binding

**No additional code needed** in consuming components!

## Default Behavior

If `additionalSettings` is not provided or empty:

-   All columns are visible
-   Widths are calculated proportionally from `control.width` values
-   Fallback: equal distribution if no width information

## Best Practices

1. **Use percentages** for responsive tables: `"30%"` vs `"200px"`
2. **Keep hidden columns in database** for flexibility (can unhide later)
3. **Test calculations** ensure total doesn't exceed 100%
4. **Consider mobile** – hidden columns may help on small screens
5. **Document decisions** – explain why certain columns are hidden

## Future Enhancements

-   `minColumnWidth`: Enforce minimum width for auto-calculated columns
-   `responsiveBreakpoint`: Custom breakpoint for mobile view
-   `sortableColumns`: Control which columns are sortable per table
-   Column reordering support
-   User preferences for column visibility

## Troubleshooting

**Columns not hiding:**

-   Check `hiddenColumns` array has correct column keys
-   Verify JSON is valid (use `ISJSON()` constraint)
-   Check `control.key` matches exactly (case-sensitive)

**Widths not applying:**

-   Verify percentages add up correctly
-   Check browser DevTools for applied styles
-   Ensure `control.width` exists for proportional calculation

**Proportional widths incorrect:**

-   Verify `control.width` array format: `[mobile, tablet, desktop]`
-   Check JSON parsing for string width values
-   Review calculation in browser console logs
