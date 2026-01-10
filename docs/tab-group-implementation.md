# TAB_GROUP Implementation Guide

## Overview

The `TAB_GROUP` feature allows you to display multiple sections as tabs in your dynamic forms. This is useful for organizing related content and improving the user experience by reducing clutter.

## Key Features

✅ Mix tabs and regular sections on the same form  
✅ Multiple independent tab groups supported  
✅ Works with existing nested group logic  
✅ No data path issues (TAB_GROUP has no key)  
✅ Error badges on tabs with validation errors  
✅ Responsive Material Design tabs

## Schema Structure

### Basic TAB_GROUP Example

```json
{
    "code": "employee_form",
    "version": "1.0.0",
    "label": "Employee Form",
    "sections": [
        {
            "label": "Quick Actions",
            "key": "quickActions",
            "type": "GROUP",
            "controls": [...]
        },
        {
            "label": "Employee Details",
            "type": "TAB_GROUP",
            "controls": [
                {
                    "label": "General Information",
                    "key": "employee",
                    "type": "GROUP",
                    "controls": [...]
                },
                {
                    "label": "Address",
                    "key": "address",
                    "type": "GROUP",
                    "controls": [...]
                },
                {
                    "label": "Dependents",
                    "key": "dependents",
                    "type": "GROUP",
                    "controls": [...]
                }
            ]
        },
        {
            "label": "Audit Information",
            "key": "audit",
            "type": "GROUP",
            "controls": [...]
        }
    ]
}
```

## Important Design Decisions

### 1. TAB_GROUP Has No Key

**Decision**: `TAB_GROUP` is purely presentational and does not have a `key` property.

**Rationale**: This prevents data nesting issues and keeps the data structure clean. The child sections within the TAB_GROUP each have their own keys and create their own data scopes.

### 2. TAB_GROUP Can Have an Optional Label

**Decision**: `TAB_GROUP` can have a label that displays above the tab bar.

**Use case**: Display "Employee Details" header above the tabs.

### 3. Child Sections Are Regular GROUP Controls

**Decision**: Each tab is a regular `GROUP` control with its own `key` and `controls`. They are stored in the TAB_GROUP's `controls` array.

**Rationale**: This reuses existing logic and makes the data structure predictable. Sections are just controls!

## Data Structure

Since `TAB_GROUP` has no `key`, it doesn't create any nesting in the data structure:

```typescript
// Form data structure (TAB_GROUP doesn't appear)
{
  quickActions: { status: 'active' },
  employee: { id: '123', firstName: 'John' },      // From tab 1
  address: { street: '123 Main St' },               // From tab 2
  dependents: { ... },                              // From tab 3
  audit: { createdDate: '2026-01-01' }
}
```

## Visual Layout

```
┌─────────────────────────────────────┐
│ Quick Actions                       │
│ [Status Dropdown ▼]                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Employee Details                    │ ← Optional TAB_GROUP label
├─────────────────────────────────────┤
│ [General Info] [Address] [Dependents] ← Tabs
├─────────────────────────────────────┤
│ Tab Content Here                    │
│                                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Audit Information                   │
│ Created Date: [Jan 1, 2026]        │
└─────────────────────────────────────┘
```

## Validation Error Badges

When a tab contains controls with validation errors, a red badge with the error count appears next to the tab label:

```
[General Info] [Address (2)] [Dependents]
                     ↑
              Error badge showing 2 invalid fields
```

## Implementation Details

### Components

-   **TabGroupComponent**: Renders the Material tabs wrapper
-   **DynamicControlComponent**: Routes TAB_GROUP type to TabGroupComponent
-   **FormGeneratorService**: Flattens TAB_GROUP sections (no data scope created)
-   **SchemaResolverService**: Recursively resolves nested sections

### Type System

```typescript
export type ControlType =
    | 'text'
    | 'number'
    | 'checkbox'
    | 'select'
    | 'date'
    | 'table'
    | 'tree'
    | 'group'
    | 'tab_group' // ← New type
    | 'TAB_GROUP'; // ← Case-insensitive support

export interface ControlDefinition {
    key: string;
    type?: ControlType;
    label?: string;

    // For groups, tables, and TAB_GROUP
    controls?: ControlConfig[];
}
```

## Usage Guidelines

### When to Use TAB_GROUP

✅ **Use TAB_GROUP when:**

-   You have multiple related sections that are logically grouped
-   You want to reduce visual clutter on long forms
-   Users need to switch between different views of the same entity
-   Content is organized into distinct categories

❌ **Don't use TAB_GROUP when:**

-   You only have 1-2 sections (not worth the overhead)
-   Sections have dependencies requiring simultaneous visibility
-   The workflow requires viewing multiple sections at once

### Best Practices

1. **Keep tab labels short** (1-3 words)
2. **Limit tabs to 3-5 per group** (more becomes overwhelming)
3. **Use meaningful labels** that clearly describe the content
4. **Consider mobile experience** (tabs work well on mobile)
5. **Don't nest TAB_GROUPs** (keep structure simple)

## Example Schema

See [employee-form-with-tabs.json](../scrap/employee-form-with-tabs.json) for a complete working example.

## Testing Checklist

-   [x] TAB_GROUP renders as mat-tab-group
-   [x] Child sections render as individual tabs
-   [x] Regular GROUP sections render as normal sections
-   [x] Form data structure is flat (no extra nesting)
-   [x] Switching tabs preserves form state
-   [x] Validation errors show on correct tabs
-   [x] Error badges display on tabs with invalid fields
-   [x] Multiple TAB_GROUP sections work independently
-   [x] Form submission includes data from all tabs

## Migration Guide

To convert existing forms to use tabs:

1. Identify sections that should be grouped as tabs
2. Wrap them in a TAB_GROUP container
3. Remove the `key` from the TAB_GROUP (if accidentally added)
4. Keep the `key` on each child section

**Before:**

```json
{
    "sections": [
        { "label": "Section 1", "key": "section1", "type": "GROUP", ... },
        { "label": "Section 2", "key": "section2", "type": "GROUP", ... },
        { "label": "Section 3", "key": "section3", "type": "GROUP", ... }
    ]
}
```

**After:**

```json
{
    "sections": [
        {
            "label": "Details",
            "type": "TAB_GROUP",
            "controls": [
                { "label": "Section 1", "key": "section1", "type": "GROUP", ... },
                { "label": "Section 2", "key": "section2", "type": "GROUP", ... },
                { "label": "Section 3", "key": "section3", "type": "GROUP", ... }
            ]
        }
    ]
}
```

## Troubleshooting

### Issue: Tabs not rendering

**Check:**

-   Is `type` set to `"TAB_GROUP"` or `"tab_group"`?
-   Does TAB_GROUP have a `sections` array?
-   Are child sections valid GROUP controls?
-   Is MatTabsModule imported? (It should be auto-imported)
    controls` array with child sections

### Issue: Data not saved properly

**Check:**

-   Does TAB_GROUP have a `key`? (It shouldn't!)
-   Do child sections have proper `key` values?
-   Are controls inside child sections configured correctly?

### Issue: Error badges not showing

**Check:**

-   Are controls marked as `touched`? (User must interact with them)
-   Are validation rules properly configured?
-   Are controls part of the FormGroup?

## Related Documentation

-   [Form Schema Interface](../projects/form-lib/src/lib/core/models/form-schema.interface.ts)
-   [Dynamic Control Component](../projects/form-lib/src/lib/shared/components/dynamic-control/dynamic-control.component.ts)
-   [Tab Group Component](../projects/form-lib/src/lib/shared/components/tab-group/tab-group.component.ts)
-   [Section Tabs Options (Original Design Doc)](./section-tabs-options.md)
