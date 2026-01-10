import { Signal, WritableSignal } from '@angular/core';
import { FormSchema } from './form-schema.interface';

/**
 * Complete form configuration and data bundle
 * Represents everything needed to render and interact with a form
 */
export interface FormContent<T = any> {
    /** Form schema defining structure and validation */
    schema: FormSchema;

    /** Initial/current form data values */
    data: T;

    /** Metadata about the form */
    metadata: FormMetadata;

    /** Optional tree/hierarchical data for navigation */
    treeData?: TreeNode[];

    /** Optional lookup/domain data for dropdowns */
    domainData?: Record<string, DomainDataItem[]>;
}

export interface FormMetadata {
    formId: string;
    formName: string;
    description?: string;
    version?: string;
    lastModified?: Date;
    permissions?: string[];
}

export interface TreeNode {
    code: string;
    displayText: string;
    parentCode?: string;
    type?: string;
    level?: number;
    children?: TreeNode[];
}

export interface DomainDataItem {
    code: string;
    displayText: string;
    parentCode?: string;
    extension?: any;
}

/**
 * Form loading state with typed data
 * Separates data loading from action execution to prevent UI issues
 */
export interface FormContentState<T = any> {
    /** Data loading status (for initial form load) */
    loadStatus: 'idle' | 'loading' | 'success' | 'error';

    /** Action status (for save/submit operations) */
    actionStatus: 'idle' | 'saving' | 'success' | 'error';

    /** Form content (available when loadStatus is success) */
    content: FormContent<T> | null;

    /** Error information for data loading */
    loadError: string | null;

    /** Error information for action execution */
    actionError: string | null;

    /** Success message after save operations */
    successMessage: string | null;
}

/**
 * Signal-based reactive form state
 */
export interface FormContentSignals<T = any> {
    state: WritableSignal<FormContentState<T>>;
    isLoading: Signal<boolean>; // Data is being loaded
    isSaving: Signal<boolean>; // Save operation in progress
    hasLoadError: Signal<boolean>; // Data loading failed
    hasActionError: Signal<boolean>; // Save/action failed
    content: Signal<FormContent<T> | null>;
}
