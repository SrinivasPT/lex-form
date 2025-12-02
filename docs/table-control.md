# Modular Table Control Requirements Specification

Here is the consolidated Requirements Specification for the Modular Table Control. You can feed this into an LLM to generate code, write tests, or implement enhancements.

## 1. Core Concept

The Table Control is a metadata-driven, composite form control designed for Angular. It wraps a FormArray to provide a "Smart Data Grid" experience. It decouples the Data Source (Reactive Forms) from the View Presentation (Sorting, Filtering, Pagination).

## 2. Schema Contract (JSON Configuration)

The control is generated entirely from a JSON configuration object.

### Interface Definition

```typescript
interface TableConfig {
    type: 'table';
    key: string; // Binds to parentForm.get(key) -> FormArray
    label: string;

    // Columns Definition (Reuses Generic Control Schema)
    controls: ControlDefinition[];

    // Feature Flags
    editMode?: 'inline' | 'popup';
    searchable?: boolean; // Enables Global Search Toolbar
    sortable?: boolean; // Enables Header Sorting

    // Client-Side Pagination
    pagination?: {
        enabled: boolean;
        pageSize: number;
    };

    // Responsive Behavior
    mobileBehavior?: 'scroll' | 'card'; // 'card' transforms rows to cards on mobile

    // Action Buttons
    headerActions?: ActionDefinition[]; // Toolbar buttons (e.g., "Export")
    rowActions?: ActionDefinition[]; // Per-row buttons (e.g., "Edit", "Delete")
    maxInlineActions?: number; // How many buttons to show before "..." menu
}
```

## 3. Architectural Components

The implementation must follow a Modular Architecture to separate concerns.

| Component                | Type                 | Responsibility                                                                                           |
| ------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------- |
| TableControlComponent    | Smart / Orchestrator | Manages the FormArray, maintains State Signals (Search, Sort, Page), and computes the final "View Rows". |
| TableToolbarComponent    | Dumb / UI            | Renders the Search Input and projects Header Action buttons. Emits search terms.                         |
| TablePaginationComponent | Dumb / UI            | Renders Page X of Y, Prev/Next buttons. Emits page change events.                                        |
| DynamicControlComponent  | Recursive Renderer   | Renders the individual cells (Inputs, Selects) inside the table rows.                                    |

## 4. Data Logic & Integrity (The "Wrapper Pattern")

Critical Requirement: Because the table supports Filtering and Sorting, the visual index (Row 1 on screen) does not match the FormArray index (Index 5 in data).

The Pipeline: Raw FormArray → Wrapper Object → Filter → Sort → Paginate → View.

The Wrapper: Every row must be mapped to an object to preserve its identity:

```typescript
{
    control: FormGroup; // The actual form data
    originalIndex: number; // The permanent index in the FormArray
}
```

Operations: All Delete/Update operations must use originalIndex.

## 5. Functional Requirements

### 5.1. Interaction

Global Search: Client-side text filtering against all values in the row.

Sorting: Clicking a header toggles Ascending → Descending → None.

Pagination: Calculates totalPages. Slices the sorted/filtered array for the current view.

### 5.2. Editing Modes

Inline: All cells are rendered as editable inputs using DynamicControlComponent.

Popup (Free Form):

-   Read Mode: Cells display text values (resolving Domain IDs to Labels).
-   Edit Mode: Clicking "Edit" opens a Modal/Dialog rendering the row's FormGroup using the Standard Section Layout.

### 5.3. Events & Actions

Event Bubbling: The table must expose an @Output() actionTriggered.

Payload: { actionId: string, rowIndex: number, rowData: any, formKey: string }.

Standard Actions: The Table handles add (push new Group) and delete (removeAt index) internally but still emits the event (allowing parents to perform side effects like toasts).

## 6. Visual & UX Requirements

### 6.1. Responsiveness (Mobile Strategy)

Desktop: Renders standard HTML `<table>`.

Mobile: Renders a Card List layout (Stack).

Implementation: Use a CSS Media Query approach or a Template Switch (`*ngIf="isMobile"`) to render `<div class="card">` elements iterating the same data source.

### 6.2. Action Overflow (Kebab Menu)

If a row has more actions than maxInlineActions (default 3), the visible buttons render first, and the remainder are grouped into a Dropdown Menu (...).

### 6.3. Empty States

No Data: If FormArray length is 0, show "No items added" + "Add Button".

No Results: If FormArray has data but Search filters everything out, show "No results for 'xyz'".

## 7. Logic & Expression Context

Row Scope: The Expression Evaluator (for visibleWhen or disabledWhen) must support row context.

Example: visibleWhen: "row.status == 'Active'"

Evaluation: evaluator.evaluate(expr, { row: currentRowValue, model: rootFormValue }).
