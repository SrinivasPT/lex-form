import { FormGroup } from '@angular/forms';

export type ControlType =
    | 'text'
    | 'number'
    | 'checkbox'
    | 'select'
    | 'date'
    | 'table'
    | 'tree'
    | 'group'
    | 'tab_group'
    | 'TEXT'
    | 'NUMBER'
    | 'CHECKBOX'
    | 'SELECT'
    | 'DATE'
    | 'TABLE'
    | 'TREE'
    | 'GROUP'
    | 'TAB_GROUP';

// 1. The Schema Contract
export interface FormSchema {
    code: string;
    version: string;
    label: string;
    sections: ControlDefinition[]; // Sections are just controls!
}

/**
 * @deprecated Use ControlDefinition directly. Sections are just controls with type='group'
 * Kept for backward compatibility
 */
export interface FormSection extends ControlDefinition {
    controls: ControlConfig[];
}

export interface TablePaginationConfig {
    enabled: boolean;
    pageSize: number;
}

export interface TableAdditionalSettings {
    visibleColumns?: string[]; // Column keys to show (if present, only these are visible)
    hiddenColumns?: string[]; // Column keys to hide
    columnWidths?: {
        [columnKey: string]: string; // e.g., "25%", "200px"
    };
    minColumnWidth?: string; // e.g., "100px" - minimum for auto-calculated columns
    responsiveBreakpoint?: number; // When to switch to mobile view
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

    // Additional Settings for column visibility and widths
    // Parsed from JSON string at schema resolution level
    additionalSettings?: TableAdditionalSettings;
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

    // Recursion (For Tables/Groups/TAB_GROUP)
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

/**
 * Form-level action configuration for DynamicFormComponent
 */
export interface FormAction {
    label: string; // Button text
    type?: 'submit' | 'button' | 'reset'; // Button type (default: 'button')
    disabled?: (form: FormGroup) => boolean; // Function to determine if button should be disabled
    handler: (form: FormGroup) => void; // Callback when button is clicked
    class?: string; // CSS class for styling
}
