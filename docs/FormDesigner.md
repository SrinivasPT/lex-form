# Form Designer Requirements

## Documents to refer

-   database-schema.md
-   FormDesigner.md

## Overview

Create a form designer application that allows editing existing forms. The designer has three main sections:

-   **Form Selector**: Dropdown to select and load an existing form from the `form` table for editing.
-   **Left Section**: Displays the control hierarchy in a tree view.
-   **Middle Section**: Defines section-control association properties for selected controls.
-   **Right Section**: Provides a live preview of the form.
-   **Actions**: Manual "Save" (draft mode) and "Publish" buttons for persistence.

## Left Section: Control Hierarchy

1. Implement a tree view to display all sections and controls associated with the selected form.
2. Display control type in brackets in the tree node label (e.g., "Employee Info [SECTION]", "Name [TEXT]").
3. Allow users to add existing controls to sections:
    - Select from existing controls where `atomic_level_code='BASE'` or `'COMPOSITE'`.
    - **Note**: New control creation is out of scope.
4. Allow users to remove controls from sections through the tree interface.
5. Support nested sections up to a maximum depth of 5 levels.
6. The tree reflects hierarchical structure via `control_group` relationships.

## Middle Section: Association Properties

1. Based on the selected node in the left section tree, display association properties.
2. **For Sections (Control Groups)**:
    - Display all child controls (from `control_group` table) in a grid/table format.
    - Allow editing of association properties per control:
        - `data_path`: Optional data binding path override
        - `width`: Responsive width (12-point grid or array)
        - `sort_order`: Display order within the section
    - **Important**: This designer only manages section-control associations. Control group creation is out of scope.
3. **Panel Layout** (optional enhancement):
    - Top Panel: Section-level properties (if any).
    - Bottom Panel: Grid of child controls with editable association properties.

## Right Section: Preview

-   Provide a real-time preview of the form using the existing `app-dynamic-form` component.
-   Updates dynamically with debouncing (up to 10 seconds) as changes are made in the left and middle sections.
-   Reflects property changes, control additions, and removals automatically.

## Implementation Approach

-   Build the form designer using the existing `app-dynamic-form` component to minimize new code.
-   Leverage existing data sources, schemas, and services (e.g., domain data, form schemas, control library) to the extent possible.
-   Reuse shared components, utilities, and backend APIs for control management and form generation.

# Additional Info

## Data Model

-   **Sections**: Controls with `atomic_level_code='SECTION'` that act as containers.
-   **Control Groups**: Defined via `control_group` table, representing parent-child relationships.
-   **Controls**: Can be `BASE` (inputs, selects, dates) or `COMPOSITE` (tables, groups).
-   Refer to "database-schema.md" for detailed schema information.

## Association Properties

-   Only `control_group` table properties are editable: `data_path`, `width`, `sort_order`.
-   Controls can belong to multiple sections (control groups).
-   Data path validation across controls is not enforced (optional override, not the default).

## UI Behavior

-   **Tree View**: Uses existing tree control component; shows type in brackets.
-   **Form Selection**: Dropdown loads forms from `form` table.
-   **Preview**: 10-second debounce for performance.
-   **Save/Publish**: Manual actions with draft mode support (`is_published` flag).
-   **Expression Fields**: Plain text inputs for now (expression builder is future work).
-   **UI Components**: Reuse existing Angular Material components.

## Validation Rules

-   Maximum section nesting depth: 5 levels.
-   Controls must exist in `control` table before association.
-   No duplicate associations within the same section.

## Backend Integration

Required API endpoints:

-   `GET /forms` - List all forms for selection dropdown
-   `GET /form/:formCode` - Load form schema (existing)
-   `GET /controls` - List available BASE and COMPOSITE controls
-   `POST /form/:formCode/control-group` - Add/update control-section association
-   `DELETE /form/:formCode/control-group/:controlCode/:childControlCode` - Remove association
-   `PUT /form/:formCode` - Update form metadata (label, description, publish status)

## Key Decisions Summary

All clarifications have been incorporated into the requirements above. Key decisions:

1. **Persistence**: Draft mode with manual Save/Publish workflow
2. **Control Source**: Select from existing BASE/COMPOSITE controls only (no creation)
3. **Scope**: Section-control associations only (control group creation out of scope)
4. **Tree Display**: Show control type in brackets (e.g., "[SECTION]", "[TEXT]")
5. **Preview**: Auto-refresh with 10-second debounce
6. **UI**: Reuse existing Angular Material components
7. **Expressions**: Plain text fields (rich editor is future work)
8. **Nesting**: Maximum depth of 5 levels for sections
9. **Multi-membership**: Controls can belong to multiple sections

---

# Implementation Plan

## Phase 1: Backend API Development

### 1.1 New API Endpoints (backend/server.js)

Add the following endpoints to support form designer operations:

```javascript
// GET /forms - List all forms
// Returns: [{ code, version, label, description, is_published }]

// GET /controls?atomicLevel=BASE,COMPOSITE - List available controls
// Returns: [{ code, type, label, atomic_level_code }]

// POST /form/:formCode/control-group - Add/update association
// Body: { controlCode, childControlCode, dataPath?, width?, sortOrder }
// Returns: success/error with validation

// DELETE /form/:formCode/control-group/:controlCode/:childControlCode
// Returns: success/error

// PUT /form/:formCode - Update form metadata
// Body: { label?, description?, is_published? }
// Returns: updated form object
```

**IMPORTANT**: Add form.js, control.js and contro-group.js and add the end points in appropriate files

### 1.2 Database Queries

Create inline queries for:

-   IT IS ALREADY THERE IN server.js **`server.js app.get('/form/:formCode', async (req, res)`**: Returns tree structure with sections and their children from `control_group`
-   IGNORE THIS. WE WILL HAVE THIS VALIDATE LATER------------**fn_ValidateNestingDepth(controlCode, childControlCode)**: Checks max depth of 5.
-   **fn_GetControlGroupAssociations(controlCode)**: Returns all child controls with association properties

## Phase 2: Frontend Services

### 2.1 Create FormDesignerService (src/app/core/services/form-designer.service.ts)

This service acts as the **single source of truth** for the designer's state and manages all form/section/control data.

#### Data Structures

```typescript
// Core data structure representing a control with its association properties
interface ControlAssociation {
    controlCode: string;
    childControlCode: string;
    label: string; // From control table
    type: string; // From control table
    atomicLevelCode: string; // From control table

    // Association properties from control_group table
    dataPath?: string;
    width?: string; // JSON array or number
    sortOrder: number;

    // Metadata
    hasChildren?: boolean;
    depth?: number; // Track nesting depth
}

// Form metadata
interface FormMetadata {
    code: string;
    version: string;
    label: string;
    description?: string;
    isPublished: boolean;
}

// Tree node for hierarchy display
interface HierarchyNode extends ControlAssociation {
    children: HierarchyNode[];
    parentCode?: string;
}
```

#### Service Implementation

```typescript
@Injectable({ providedIn: 'root' })
export class FormDesignerService {
    private http = inject(HttpClient);

    // ========================================
    // STATE SIGNALS (Single Source of Truth)
    // ========================================

    // Current form being edited
    selectedForm = signal<FormMetadata | null>(null);

    // Currently selected node in the tree
    selectedNode = signal<HierarchyNode | null>(null);

    // Complete form hierarchy (tree structure)
    // This is loaded once from API and kept in sync with edits
    formHierarchy = signal<HierarchyNode[]>([]);

    // Map of section code -> array of child control associations
    // This is the MASTER data for section-control relationships
    // Structure: { 'employee_section': [{ controlCode, childControlCode, dataPath, width, sortOrder }, ...] }
    sectionAssociations = signal<Map<string, ControlAssociation[]>>(new Map());

    // Available controls that can be added to sections
    availableControls = signal<Control[]>([]);

    // Track if form has unsaved changes
    isDirty = signal<boolean>(false);

    // ========================================
    // COMPUTED SIGNALS (Derived State)
    // ========================================

    // Get children for currently selected section
    selectedSectionChildren = computed(() => {
        const node = this.selectedNode();
        if (!node || node.atomicLevelCode !== 'SECTION') return [];

        return this.sectionAssociations().get(node.controlCode) || [];
    });

    // Get preview schema by converting current state to FormSchema
    previewSchema = computed(() => {
        const form = this.selectedForm();
        const hierarchy = this.formHierarchy();
        if (!form || !hierarchy.length) return null;

        return this.buildFormSchema(form, hierarchy);
    });

    // ========================================
    // DATA LOADING METHODS
    // ========================================

    /**
     * Load form with all sections and associations
     * This populates both formHierarchy and sectionAssociations
     */
    loadForm(formCode: string): Observable<void> {
        return this.http.get<any>(`/api/form/${formCode}`).pipe(
            tap((response) => {
                // Set form metadata
                this.selectedForm.set({
                    code: response.code,
                    version: response.version,
                    label: response.label,
                    description: response.description,
                    isPublished: response.is_published,
                });

                // Build hierarchy tree from sections
                const hierarchy = this.buildHierarchyTree(response.sections);
                this.formHierarchy.set(hierarchy);

                // Extract all section associations into map
                const associations = this.extractAssociations(response.sections);
                this.sectionAssociations.set(associations);

                this.isDirty.set(false);
            }),
            map(() => void 0)
        );
    }

    /**
     * Load available controls that can be added to sections
     */
    loadAvailableControls(): Observable<void> {
        return this.http.get<Control[]>('/api/controls?atomicLevel=BASE,COMPOSITE').pipe(
            tap((controls) => this.availableControls.set(controls)),
            map(() => void 0)
        );
    }

    // ========================================
    // DATA MANIPULATION METHODS
    // ========================================

    /**
     * Add control to section (or update existing association)
     * Updates both sectionAssociations map and formHierarchy tree
     */
    addControlToSection(
        sectionCode: string,
        childControlCode: string,
        props: { dataPath?: string; width?: string; sortOrder?: number }
    ): Observable<void> {
        // Get current associations for this section
        const associations = new Map(this.sectionAssociations());
        const sectionChildren = associations.get(sectionCode) || [];

        // Check if already exists
        const existingIndex = sectionChildren.findIndex(
            (a) => a.childControlCode === childControlCode
        );

        // Get control details from availableControls
        const controlDetails = this.availableControls().find((c) => c.code === childControlCode);
        if (!controlDetails) {
            return throwError(() => new Error('Control not found'));
        }

        const newAssociation: ControlAssociation = {
            controlCode: sectionCode,
            childControlCode,
            label: controlDetails.label,
            type: controlDetails.type,
            atomicLevelCode: controlDetails.atomic_level_code,
            dataPath: props.dataPath,
            width: props.width,
            sortOrder: props.sortOrder ?? sectionChildren.length,
        };

        if (existingIndex >= 0) {
            // Update existing
            sectionChildren[existingIndex] = newAssociation;
        } else {
            // Add new
            sectionChildren.push(newAssociation);
        }

        // Update map
        associations.set(sectionCode, sectionChildren);
        this.sectionAssociations.set(associations);

        // Update hierarchy tree
        this.updateHierarchyTree(sectionCode, childControlCode, 'add');

        this.isDirty.set(true);

        // Return observable for API call (could be deferred to save)
        return of(void 0);
    }

    /**
     * Remove control from section
     */
    removeControlFromSection(sectionCode: string, childControlCode: string): Observable<void> {
        const associations = new Map(this.sectionAssociations());
        const sectionChildren = associations.get(sectionCode) || [];

        // Remove from array
        const filtered = sectionChildren.filter((a) => a.childControlCode !== childControlCode);
        associations.set(sectionCode, filtered);
        this.sectionAssociations.set(associations);

        // Update hierarchy tree
        this.updateHierarchyTree(sectionCode, childControlCode, 'remove');

        this.isDirty.set(true);

        return of(void 0);
    }

    /**
     * Update association properties for a control in a section
     * Called when user edits dataPath, width, or sortOrder in middle panel
     */
    updateAssociationProperties(
        sectionCode: string,
        childControlCode: string,
        props: Partial<{ dataPath: string; width: string; sortOrder: number }>
    ): void {
        const associations = new Map(this.sectionAssociations());
        const sectionChildren = associations.get(sectionCode) || [];

        // Find and update the specific association
        const association = sectionChildren.find((a) => a.childControlCode === childControlCode);
        if (association) {
            Object.assign(association, props);

            // Re-sort if sortOrder changed
            if (props.sortOrder !== undefined) {
                sectionChildren.sort((a, b) => a.sortOrder - b.sortOrder);
            }

            associations.set(sectionCode, [...sectionChildren]); // Create new array for reactivity
            this.sectionAssociations.set(associations);
            this.isDirty.set(true);
        }
    }

    /**
     * Save all changes to backend
     * Sends all modified associations to API
     */
    saveForm(): Observable<void> {
        const formCode = this.selectedForm()?.code;
        if (!formCode) return throwError(() => new Error('No form selected'));

        const associations = this.sectionAssociations();
        const updates: any[] = [];

        // Flatten all associations for API call
        associations.forEach((children, sectionCode) => {
            children.forEach((child) => {
                updates.push({
                    controlCode: sectionCode,
                    childControlCode: child.childControlCode,
                    dataPath: child.dataPath,
                    width: child.width,
                    sortOrder: child.sortOrder,
                });
            });
        });

        // Batch update to API
        return this.http
            .post(`/api/form/${formCode}/control-group/batch`, { associations: updates })
            .pipe(tap(() => this.isDirty.set(false)));
    }

    // ========================================
    // HELPER METHODS
    // ========================================

    /**
     * Build hierarchy tree from flat sections array
     * Recursively creates parent-child relationships
     */
    private buildHierarchyTree(sections: any[]): HierarchyNode[] {
        // Implementation details...
        // Convert flat API response to nested tree structure
    }

    /**
     * Extract associations from sections into Map
     * Key: section code, Value: array of child associations
     */
    private extractAssociations(sections: any[]): Map<string, ControlAssociation[]> {
        const map = new Map<string, ControlAssociation[]>();

        const processSection = (section: any) => {
            if (section.controls && section.controls.length > 0) {
                const children: ControlAssociation[] = section.controls.map((c: any) => ({
                    controlCode: section.code,
                    childControlCode: c.code,
                    label: c.label,
                    type: c.type,
                    atomicLevelCode: c.atomic_level_code,
                    dataPath: c.dataPath,
                    width: c.width,
                    sortOrder: c.sortOrder || 0,
                }));

                map.set(section.code, children);

                // Recursively process nested sections
                section.controls.forEach((c: any) => {
                    if (c.atomicLevelCode === 'SECTION' && c.controls) {
                        processSection(c);
                    }
                });
            }
        };

        sections.forEach(processSection);
        return map;
    }

    /**
     * Update hierarchy tree when control is added/removed
     */
    private updateHierarchyTree(
        sectionCode: string,
        childCode: string,
        action: 'add' | 'remove'
    ): void {
        // Find section node and update its children
        // This keeps the tree view in sync with associations map
    }

    /**
     * Build FormSchema for preview from current state
     */
    private buildFormSchema(form: FormMetadata, hierarchy: HierarchyNode[]): FormSchema {
        // Convert hierarchy tree + associations map back to FormSchema format
        // Used by preview panel
    }
}
```

#### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    FormDesignerService                       │
│                  (Single Source of Truth)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  selectedForm: FormMetadata                                  │
│  ├─ code, version, label, is_published                       │
│                                                               │
│  formHierarchy: HierarchyNode[]                             │
│  ├─ Tree structure for LEFT PANEL display                   │
│  └─ Updated when controls added/removed                      │
│                                                               │
│  sectionAssociations: Map<sectionCode, ControlAssociation[]>│
│  ├─ MASTER DATA for MIDDLE PANEL                            │
│  ├─ Key: section code (e.g., 'employee_section')           │
│  └─ Value: Array of child controls with props               │
│      ├─ childControlCode                                     │
│      ├─ dataPath (editable)                                 │
│      ├─ width (editable)                                    │
│      └─ sortOrder (editable)                                │
│                                                               │
│  selectedSectionChildren: computed                           │
│  └─ Returns children for selected section (for grid)        │
│                                                               │
│  previewSchema: computed                                     │
│  └─ Rebuilds FormSchema from hierarchy + associations       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
         │                    │                    │
         ↓                    ↓                    ↓
┌──────────────┐  ┌──────────────────┐  ┌─────────────────┐
│ LEFT PANEL   │  │  MIDDLE PANEL    │  │  RIGHT PANEL    │
│ (Tree View)  │  │  (Properties)    │  │  (Preview)      │
├──────────────┤  ├──────────────────┤  ├─────────────────┤
│              │  │                  │  │                 │
│ Reads:       │  │ Reads:           │  │ Reads:          │
│ formHierarchy│  │ selectedSection  │  │ previewSchema   │
│              │  │   Children       │  │ (computed)      │
│              │  │                  │  │                 │
│ Writes:      │  │ Writes:          │  │ Writes:         │
│ - Add ctrl   │  │ - Update         │  │ (none - read    │
│ - Remove ctrl│  │   dataPath       │  │  only)          │
│ - Select node│  │ - Update width   │  │                 │
│              │  │ - Update sort    │  │                 │
│              │  │ (via service     │  │                 │
│              │  │  methods)        │  │                 │
└──────────────┘  └──────────────────┘  └─────────────────┘
```

#### Key Points

1. **sectionAssociations Map** is the master data source for the middle panel grid
2. **formHierarchy** is derived from sectionAssociations for tree display
3. **Middle panel edits** call `updateAssociationProperties()` which updates the map
4. **Changes are kept in memory** until "Save" button is clicked
5. **Preview auto-rebuilds** from the computed signal with debouncing
6. **All panels read from signals** - no direct data passing between components

### 2.2 Enhance Existing Services

-   **SchemaResolverService**: Add method to rebuild schema from tree structure
-   **FormGeneratorService**: Ensure it handles dynamic schema updates

## Phase 3: Angular Components

### 3.1 Create FormDesignerComponent (src/app/form-designer/form-designer.component.ts)

Main orchestrator component with three-panel layout:

```typescript
@Component({
    selector: 'app-form-designer',
    template: `
        <div class="designer-container">
            <div class="designer-header">
                <app-form-selector />
                <div class="actions">
                    <button (click)="save()">Save</button>
                    <button (click)="publish()">Publish</button>
                </div>
            </div>
            <div class="designer-panels">
                <app-hierarchy-panel class="left-panel" />
                <app-properties-panel class="middle-panel" />
                <app-preview-panel class="right-panel" />
            </div>
        </div>
    `
})
```

**Responsibilities**:

-   Initialize FormDesignerService
-   Coordinate communication between panels
-   Handle save/publish actions
-   Manage dirty state tracking

### 3.2 Create FormSelectorComponent (src/app/form-designer/form-selector/form-selector.component.ts)

```typescript
@Component({
    selector: 'app-form-selector',
    template: `
        <mat-form-field>
            <mat-label>Select Form</mat-label>
            <mat-select [(ngModel)]="selectedFormCode" (selectionChange)="onFormChange()">
                <mat-option *ngFor="let form of forms()" [value]="form.code">
                    {{ form.label }} (v{{ form.version }})
                </mat-option>
            </mat-select>
        </mat-form-field>
    `
})
```

**Responsibilities**:

-   Load forms list from API
-   Emit selection changes
-   Display form version and publish status

### 3.3 Create HierarchyPanelComponent (src/app/form-designer/hierarchy-panel/hierarchy-panel.component.ts)

Reuse existing tree-control logic with enhancements:

```typescript
@Component({
    selector: 'app-hierarchy-panel',
    template: `
        <div class="hierarchy-panel">
            <h3>Form Structure</h3>
            <button mat-button (click)="addControl()">Add Control</button>
            <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
                <!-- Node template with type in brackets -->
                <mat-tree-node>
                    <span>{{ node.label }} [{{ node.type }}]</span>
                    <button mat-icon-button (click)="removeControl(node)">
                        <mat-icon>delete</mat-icon>
                    </button>
                </mat-tree-node>
            </mat-tree>
        </div>
    `
})
```

**Responsibilities**:

-   Display form hierarchy as tree
-   Show control type in brackets
-   Handle node selection (emit to designer service)
-   Add/remove controls with validation
-   Prevent nesting beyond depth 5

### 3.4 Create ControlSelectorDialogComponent (src/app/form-designer/control-selector-dialog/control-selector-dialog.component.ts)

Material dialog for selecting controls to add:

```typescript
@Component({
    selector: 'app-control-selector-dialog',
    template: `
        <h2 mat-dialog-title>Add Control</h2>
        <mat-dialog-content>
            <mat-form-field>
                <input matInput [(ngModel)]="searchText" placeholder="Search controls" />
            </mat-form-field>
            <mat-selection-list [(ngModel)]="selectedControls">
                <mat-list-option *ngFor="let ctrl of filteredControls()" [value]="ctrl">
                    {{ ctrl.label }} [{{ ctrl.type }}]
                </mat-list-option>
            </mat-selection-list>
        </mat-dialog-content>
        <mat-dialog-actions>
            <button mat-button (click)="cancel()">Cancel</button>
            <button mat-button (click)="confirm()" [disabled]="!selectedControls">Add</button>
        </mat-dialog-actions>
    `
})
```

**Responsibilities**:

-   Display available BASE/COMPOSITE controls
-   Filter by search text
-   Return selected control(s)

### 3.5 Create PropertiesPanelComponent (src/app/form-designer/properties-panel/properties-panel.component.ts)

```typescript
@Component({
    selector: 'app-properties-panel',
    template: `
        <div class="properties-panel">
            <h3>Association Properties</h3>
            @if (selectedNode(); as node) {
                @if (node.type === 'SECTION') {
                    <app-section-properties [node]="node" />
                } @else {
                    <p>Select a section to edit properties</p>
                }
            } @else {
                <p>No selection</p>
            }
        </div>
    `
})
```

**Responsibilities**:

-   Listen to selected node from FormDesignerService
-   Render appropriate property editor based on node type

### 3.6 Create SectionPropertiesComponent (src/app/form-designer/section-properties/section-properties.component.ts)

```typescript
@Component({
    selector: 'app-section-properties',
    template: `
        <div class="section-properties">
            <!-- Optional: Section-level properties -->
            <h4>Child Controls</h4>
            <table mat-table [dataSource]="childControls()">
                <ng-container matColumnDef="label">
                    <th mat-header-cell *matHeaderCellDef>Control</th>
                    <td mat-cell *matCellDef="let ctrl">{{ ctrl.label }} [{{ ctrl.type }}]</td>
                </ng-container>
                <ng-container matColumnDef="dataPath">
                    <th mat-header-cell *matHeaderCellDef>Data Path</th>
                    <td mat-cell *matCellDef="let ctrl">
                        <input [(ngModel)]="ctrl.dataPath" (ngModelChange)="onPropertyChange()" />
                    </td>
                </ng-container>
                <ng-container matColumnDef="width">
                    <th mat-header-cell *matHeaderCellDef>Width</th>
                    <td mat-cell *matCellDef="let ctrl">
                        <input [(ngModel)]="ctrl.width" (ngModelChange)="onPropertyChange()" />
                    </td>
                </ng-container>
                <ng-container matColumnDef="sortOrder">
                    <th mat-header-cell *matHeaderCellDef>Sort Order</th>
                    <td mat-cell *matCellDef="let ctrl">
                        <input type="number" [(ngModel)]="ctrl.sortOrder" (ngModelChange)="onPropertyChange()" />
                    </td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
        </div>
    `
})
```

**Responsibilities**:

-   Load child controls from `control_group` for selected section
-   Display editable grid with `data_path`, `width`, `sort_order`
-   Emit changes with debouncing to FormDesignerService
-   Mark form as dirty on any change

### 3.7 Create PreviewPanelComponent (src/app/form-designer/preview-panel/preview-panel.component.ts)

```typescript
@Component({
    selector: 'app-preview-panel',
    template: `
        <div class="preview-panel">
            <h3>Preview</h3>
            @if (previewSchema(); as schema) {
                <app-dynamic-form [schema]="schema" />
            } @else {
                <p>Loading preview...</p>
            }
        </div>
    `
})
```

**Responsibilities**:

-   Subscribe to changes from FormDesignerService
-   Rebuild FormSchema from current tree structure
-   Apply 10-second debounce before refreshing
-   Render using existing `app-dynamic-form` component

## Phase 4: Routing & Integration

### 4.1 Update Routes (src/app/app.routes.ts)

```typescript
export const routes: Routes = [
    { path: '', redirectTo: '/demo', pathMatch: 'full' },
    { path: 'demo-control', component: DemoControlComponent },
    { path: 'demo-app', component: DemoAppComponent },
    {
        path: 'designer',
        component: FormDesignerComponent,
        children: [{ path: ':formCode', component: FormDesignerComponent }],
    },
];
```

### 4.2 Navigation

Add link in main app navigation to `/designer`

## Phase 5: Styling & UX

### 5.1 Layout (form-designer.component.scss)

```scss
.designer-container {
    display: flex;
    flex-direction: column;
    height: 100vh;

    .designer-header {
        display: flex;
        justify-content: space-between;
        padding: 16px;
        border-bottom: 1px solid #ccc;
    }

    .designer-panels {
        display: grid;
        grid-template-columns: 300px 1fr 400px;
        gap: 16px;
        flex: 1;
        overflow: hidden;

        .left-panel,
        .middle-panel,
        .right-panel {
            overflow-y: auto;
            padding: 16px;
        }
    }
}
```

### 5.2 Responsive Design

-   On tablets: Stack middle and right panels vertically
-   On mobile: Show one panel at a time with tabs

## Phase 6: Testing & Validation

### 6.1 Unit Tests

-   FormDesignerService API methods
-   Component logic for add/remove/update operations
-   Validation rules (max depth, duplicates)

### 6.2 Integration Tests

-   Full workflow: Load form → Add control → Edit properties → Preview → Save
-   Error handling for API failures
-   Dirty state tracking and unsaved changes warning

### 6.3 E2E Tests

-   Navigate to designer
-   Select form
-   Perform CRUD operations on hierarchy
-   Verify preview updates
-   Save and publish

## Phase 7: Documentation

-   Update README with designer usage instructions
-   Create video/gif demo of key workflows
-   Document API endpoints in backend README

---

## Implementation Order

1. **Backend First**: API endpoints (Phase 1)
2. **Core Service**: FormDesignerService (Phase 2.1)
3. **Main Component**: FormDesignerComponent skeleton (Phase 3.1)
4. **Left Panel**: HierarchyPanel + ControlSelectorDialog (Phase 3.3, 3.4)
5. **Middle Panel**: PropertiesPanel + SectionProperties (Phase 3.5, 3.6)
6. **Right Panel**: PreviewPanel with debouncing (Phase 3.7)
7. **Top Bar**: FormSelector + Actions (Phase 3.2)
8. **Integration**: Routing, styling, polish (Phases 4, 5)
9. **Testing**: Unit, integration, E2E (Phase 6)

## Estimated Effort

-   Backend APIs: 4-6 hours
-   Frontend Services: 3-4 hours
-   Angular Components: 12-16 hours
-   Integration & Styling: 4-6 hours
-   Testing: 6-8 hours
-   **Total**: ~30-40 hours

## Technology Stack

-   **Backend**: Node.js + Express + mssql
-   **Frontend**: Angular 18 + Angular Material + Signals
-   **Database**: SQL Server with stored procedures
-   **State Management**: Angular Signals (no NgRx needed for MVP)
-   **HTTP**: Angular HttpClient with RxJS

==========================
Clarification Questions:
Question 1: FormSelectorComponent using select-control
The existing select-control expects:

A FormGroup with formControlName binding
Either static options array or dynamic categoryCode for domain data
For Form Selector:

Should we create a mini FormGroup just for the selector control?
OR should FormSelectorComponent use a standalone [(ngModel)] binding?
What should be the data source? Should forms list come from a domain_data category (e.g., category_code='FORMS') or a dedicated API endpoint?
Question 2: HierarchyPanelComponent using tree-control
The existing tree-control is designed for form data binding (selecting values from a tree structure).

For Hierarchy Panel:

Should we extend/fork tree-control to support designer mode with add/remove buttons per node?
OR create a new component that reuses tree-control's display logic but adds designer actions?
How do we handle the "Add Control" button? Should it appear:
At the top (adds to root level)?
On each node (adds child to that node)?
Only on SECTION nodes?
Question 3: ControlSelectorDialog using table-control - CRITICAL
This is confusing because:

table-control is designed for array data editing (FormArray with add/remove rows)
You want it to select a single control and return the control code
Questions:

Should the dialog display available controls in a read-only table (no FormArray, just display)?
How do we enable row selection? Add a radio button column or make rows clickable?
Should we use table-control's existing search functionality as-is?
Do we need to modify table-control to support a "selection mode"?
Question 4 & 5: PropertiesPanel & SectionPropertiesComponent - MOST CONFUSING
You said:

"it should be rendered by app-dynamic-form and section need to be created and associate the control group.... currently I am creating tables.. actually it should be control group and whether to render it as a table or free form is association property"

I'm confused about:

What should be rendered by app-dynamic-form?

The properties panel itself?
OR the child controls grid?
"section need to be created and associate the control group" - Do you mean:

We should create a FormSchema dynamically that represents the properties form?
This schema should have a section that contains the child controls as a control group?
"whether to render it as a table or free form is association property" - Do you mean:

The control_group table has a property that determines display mode (table vs form)?
OR this should be a property in the control table?
What property name? Is this layout_config field in control table?
Currently showing child controls in a table - Should this be:

A TABLE control (editable grid) rendered by dynamic-form?
OR a GROUP control with free-form layout?
Is the display mode stored in database or hardcoded?
Question 6: Control Group Definition
Looking at the schema, control_group table represents associations between a parent control and child controls. But in your group-control.md doc, I see that groups can also be:

TYPE='GROUP' controls with COMPOSITE atomic level
Sections with nested controls
For the designer:

Are we editing associations in the control_group table?
OR are we creating new controls with type='GROUP'?
OR both?
My Understanding (Please Confirm):
Here's what I think you're asking for:

Scenario A: Simple Interpretation
Scenario B: Complex Interpretation
Recommendation:
Please clarify by answering these specific questions:

Form Selector: Domain data category or API endpoint? FormGroup or ngModel?
Hierarchy Panel: Fork tree-control or create new component?
Control Selector Dialog: How to add row selection to table-control?
Properties Panel: Should it use dynamic-form? What is the "association property" for table vs form rendering?
Control Group: Are we editing control_group table associations or creating GROUP type controls?
Once you clarify, I'll update the implementation plan with precise technical details.
