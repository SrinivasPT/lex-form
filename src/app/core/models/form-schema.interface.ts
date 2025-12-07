export type ControlType =
    | 'text'
    | 'number'
    | 'checkbox'
    | 'select'
    | 'date'
    | 'table'
    | 'group'
    | 'TEXT'
    | 'NUMBER'
    | 'CHECKBOX'
    | 'SELECT'
    | 'DATE'
    | 'TABLE'
    | 'GROUP';

// 1. The Schema Contract
export interface FormSchema {
    code: string;
    version: string;
    label: string;
    sections: FormSection[];
}

export interface FormSection {
    code?: string;
    label?: string;
    key?: string; // Creates a Nested Data Scope if present
    type?: ControlType; // Sections can be explicit group controls
    width?: number | number[] | string; // 12-point grid scale or string like "[12]"
    required?: boolean;
    readonly?: boolean;
    controls: ControlConfig[];
}

export interface TablePaginationConfig {
    enabled: boolean;
    pageSize: number;
}

export interface TableConfig extends ControlDefinition {
    type: 'table';

    // Features
    pagination?: TablePaginationConfig;
    searchable?: boolean;
    sortable?: boolean;

    // Actions
    rowActions?: ActionDefinition[]; // Buttons per row
    headerActions?: ActionDefinition[]; // Buttons in toolbar

    // Visuals
    maxInlineActions?: number; // Defaults to 3
    addLabel?: string;

    // New: Mobile Strategy
    mobileBehavior?: 'scroll' | 'card' | 'accordion'; // Default: 'card'
}

// 2. The Control Definitions
export type ControlConfig = string | ControlDefinition;

export interface ControlDefinition {
    code?: string;
    key: string;
    type?: ControlType;
    label?: string;
    placeholder?: string;
    hidden?: boolean;
    width?: number | number[] | string; // 12-point grid scale, array, or string like "[12]"

    // Data Path Override - if specified, control data lives at this path regardless of section placement
    dataPath?: string;

    // Static Options (Simple Lists)
    options?: { label: string; value: any }[];

    // Domain / Data Source
    categoryCode?: string;
    dependentOn?: string;

    // Logic Expressions (Safe Strings)
    visibleWhen?: string; // e.g., "model.age > 18"
    disabledWhen?: string;
    requiredWhen?: string;

    // Validation (both old and new style)
    validators?: Record<string, any>; // { required: true, min: 10 }
    required?: boolean;
    readonly?: boolean;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;

    // Recursion (For Tables/Groups)
    controls?: ControlConfig[];
}

export interface ActionDefinition {
    id: string; // 'edit', 'delete', 'custom'
    label?: string; // 'Remove'
    icon?: string; // 'fa fa-trash'
    cssClass?: string; // 'btn-danger'
    visibleWhen?: string; // 'row.status == "draft"'
    ariaLabel?: string; // Accessibility label
}
