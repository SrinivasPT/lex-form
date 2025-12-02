export type ControlType = 'text' | 'number' | 'checkbox' | 'select' | 'date' | 'table' | 'group';

// 1. The Schema Contract
export interface FormSchema {
    code: string;
    version: string;
    label: string;
    sections: FormSection[];
}

export interface FormSection {
    label?: string;
    key?: string; // Creates a Nested Data Scope if present
    width?: number | number[]; // 12-point grid scale. Single value or [Mobile, Tablet, Desktop] e.g., 6 or [12, 6, 4]
    controls: ControlConfig[];
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
    width?: number | number[]; // 12-point grid scale. Single value or [Mobile, Tablet, Desktop] e.g., 6 or [12, 6, 4]

    // Static Options (Simple Lists)
    options?: { label: string; value: any }[];

    // Domain / Data Source
    domainConfig?: {
        categoryCode: string;
        dependentOn?: string;
        cacheTtl?: number;
    };

    // Logic Expressions (Safe Strings)
    visibleWhen?: string; // e.g., "model.age > 18"
    disabledWhen?: string;
    requiredWhen?: string;

    // Validation
    validators?: Record<string, any>; // { required: true, min: 10 }

    // Recursion (For Tables/Groups)
    rowConfig?: ControlConfig[];
}
