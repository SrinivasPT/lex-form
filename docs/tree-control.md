# Tree Control

## Overview

The tree control is a wrapper around Angular Material's tree component that displays hierarchical data in a collapsible tree structure. It behaves like a select control from a data handling perspective - it stores a single selected value (the code of the selected node) in the form.

## Features

-   **Hierarchical Display**: Shows data in parent-child tree structure
-   **Expandable Nodes**: Click arrows to expand/collapse branches
-   **Node Selection**: Click any node (leaf or branch) to select it
-   **Visual Feedback**: Selected nodes are highlighted
-   **Keyboard Support**: Navigate and select using Enter/Space keys
-   **Domain Data Integration**: Works with static options or dynamic domain data
-   **Dependent Trees**: Support for parent-dependent tree loading
-   **Loading States**: Shows loading indicator while fetching data

## Data Structure

Tree nodes support parent-child relationships via `parentCode`:

```typescript
interface TreeNode {
    code: string; // Unique identifier
    displayText: string; // Display label
    parentCode?: string; // Parent node's code (null for root)
}
```

## Usage Examples

### 1. Static Tree (Inline Options)

```typescript
{
    key: 'department',
    type: 'tree',
    label: 'Department',
    options: [
        { label: 'Engineering', value: 'ENG' },
        { label: 'Frontend', value: 'ENG-FE', parentCode: 'ENG' },
        { label: 'Backend', value: 'ENG-BE', parentCode: 'ENG' },
        { label: 'Sales', value: 'SALES' },
        { label: 'Enterprise', value: 'SALES-ENT', parentCode: 'SALES' },
    ]
}
```

### 2. Domain-Driven Tree (Category Code)

```typescript
{
    key: 'location',
    type: 'tree',
    label: 'Location',
    categoryCode: 'LOCATION',
    validators: { required: true }
}
```

The domain data should include `parentCode` for hierarchical relationships:

```json
[
    { "code": "USA", "displayText": "United States", "parentCode": null },
    { "code": "USA-CA", "displayText": "California", "parentCode": "USA" },
    { "code": "USA-CA-SF", "displayText": "San Francisco", "parentCode": "USA-CA" },
    { "code": "USA-NY", "displayText": "New York", "parentCode": "USA" }
]
```

### 3. Dependent Tree

```typescript
{
    key: 'region',
    type: 'select',
    label: 'Region',
    categoryCode: 'REGION'
},
{
    key: 'subRegion',
    type: 'tree',
    label: 'Sub-Region',
    categoryCode: 'SUB_REGION',
    dependentOn: 'region',
    disabledWhen: 'model.region == null'
}
```

### 4. In Control Library

```typescript
'organization.department': {
    key: 'department',
    type: 'tree',
    label: 'Department Hierarchy',
    categoryCode: 'DEPARTMENT',
    validators: { required: true }
}
```

## Form Value

The tree control stores only the selected node's code:

```typescript
// When user selects "San Francisco" node:
formValue = {
    location: 'USA-CA-SF', // Just the code, not the full path
};
```

## Configuration Options

| Property       | Type   | Description                              |
| -------------- | ------ | ---------------------------------------- |
| `key`          | string | Form control name                        |
| `type`         | string | Must be 'tree'                           |
| `label`        | string | Display label                            |
| `categoryCode` | string | Domain data category (dynamic data)      |
| `options`      | array  | Static options with optional parentCode  |
| `dependentOn`  | string | Parent control key for dependent loading |
| `validators`   | object | Validation rules (required, etc.)        |

## Styling

The tree control includes:

-   Border and padding around tree container
-   Max height with scroll for large trees
-   Hover effects on nodes
-   Highlighted selected state
-   Responsive icon buttons for expand/collapse
-   Loading and empty state messages

## Backend Requirements

For domain-driven trees, your API should return data with parent-child relationships:

```json
{
    "category": "LOCATION",
    "values": [
        {
            "code": "USA",
            "displayText": "United States",
            "parentCode": null
        },
        {
            "code": "USA-CA",
            "displayText": "California",
            "parentCode": "USA"
        }
    ]
}
```

## Accessibility

-   ARIA labels for expand/collapse buttons
-   Keyboard navigation (Tab, Enter, Space)
-   Role attributes for screen readers
-   Focus management

## Comparison with Select Control

| Feature        | Select       | Tree                                  |
| -------------- | ------------ | ------------------------------------- |
| Data Structure | Flat list    | Hierarchical                          |
| Display        | Dropdown     | Collapsible tree                      |
| Selection      | Single value | Single value                          |
| Visual         | Compact      | Expanded view                         |
| Use Case       | Simple lists | Organizational structures, categories |

## Common Use Cases

1. **Organization Structure**: Departments, teams, sub-teams
2. **Geographic Hierarchy**: Country → State → City
3. **Product Categories**: Category → Subcategory → Item type
4. **File System**: Folders and subfolders
5. **Taxonomies**: Classification hierarchies

## Notes

-   Tree rebuilds when dependent parent changes
-   All nodes (leaf and branch) are selectable
-   Form value is always the node's code (string)
-   Tree structure auto-calculated from parentCode relationships
-   Nodes without children are displayed as leaf nodes
