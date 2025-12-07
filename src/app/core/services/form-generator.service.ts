import { Injectable, inject } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    FormControl,
    FormArray,
    Validators,
    ValidatorFn,
} from '@angular/forms';
import {
    FormSchema,
    FormSection,
    ControlDefinition,
    ControlConfig,
} from '../models/form-schema.interface';

@Injectable({
    providedIn: 'root',
})
export class FormGeneratorService {
    private fb = inject(FormBuilder);

    private normalizeType(type?: string): string {
        return type?.toLowerCase() || 'text';
    }

    toFormGroup(schema: FormSchema): FormGroup {
        const structure: any = {};
        const controlMap = new Map<string, string>(); // controlKey -> dataPath

        // Treat each section as a potential group control
        schema.sections.forEach((section) => {
            // Section has key - creates a nested group
            if (section.key) {
                const sectionControls: any = {};
                this.buildControlsInStructure(
                    section.controls,
                    sectionControls,
                    controlMap,
                    section.key
                );
                structure[section.key] = this.fb.group(sectionControls);
                controlMap.set(section.key, section.key);
            } else {
                // Section without key - controls go to root level
                this.buildControlsInStructure(section.controls, structure, controlMap, undefined);
            }
        });

        const formGroup = this.fb.group(structure);
        // Attach metadata to FormGroup for later reference
        (formGroup as any).__controlMap = controlMap;
        (formGroup as any).__schema = schema;

        return formGroup;
    }

    private buildControlsInStructure(
        controls: ControlConfig[],
        structure: any,
        controlMap: Map<string, string>,
        parentPath?: string
    ) {
        controls.forEach((c: ControlConfig) => {
            if (typeof c === 'string') return;
            const control = c as ControlDefinition;

            // Normalize control type to lowercase
            const normalizedType = this.normalizeType(control.type);

            // Determine the data path for this control
            const dataPath = this.resolveDataPath(control, parentPath);

            // Store mapping from control key to data path
            controlMap.set(control.key, dataPath);

            // Handle different control types
            if (normalizedType === 'group') {
                // Recursive group - create nested FormGroup
                this.createNestedGroup(structure, dataPath, control, controlMap);
            } else {
                // Base control (text, number, checkbox, select, table, etc.)
                this.ensureControlAtPath(structure, dataPath, control);
            }
        });
    }

    private resolveDataPath(control: ControlDefinition, parentPath?: string): string {
        // If control has explicit dataPath, use it
        if (control.dataPath) {
            return control.dataPath;
        }

        // Otherwise, build from parent hierarchy
        if (parentPath) {
            return `${parentPath}.${control.key}`;
        }

        return control.key;
    }

    private createNestedGroup(
        structure: any,
        path: string,
        control: ControlDefinition,
        controlMap: Map<string, string>
    ) {
        const parts = path.split('.');
        let current = structure;

        // Navigate/create nested structure up to parent
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            }
            current = current[part];
        }

        // Create nested group for this control
        const finalKey = parts[parts.length - 1];
        const groupStructure: any = {};

        // Recursively build child controls
        if (control.controls && control.controls.length > 0) {
            this.buildControlsInStructure(control.controls, groupStructure, controlMap, path);
        }

        current[finalKey] = this.fb.group(groupStructure);
    }

    private ensureControlAtPath(structure: any, path: string, control: ControlDefinition) {
        const parts = path.split('.');
        let current = structure;

        // Navigate/create nested structure
        for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) {
                current[part] = {};
            } else if (
                typeof current[part] !== 'object' ||
                current[part] instanceof FormControl ||
                current[part] instanceof FormArray
            ) {
                // Path conflict - a control already exists at an intermediate path
                console.warn(
                    `Path conflict at ${parts
                        .slice(0, i + 1)
                        .join('.')}: cannot create nested structure`
                );
                return;
            }
            current = current[part];
        }

        // Add control at final location
        const finalKey = parts[parts.length - 1];
        const normalizedType = this.normalizeType(control.type);

        if (normalizedType === 'table') {
            current[finalKey] = this.fb.array([], this.getValidators(control));
        } else {
            const initialValue = normalizedType === 'checkbox' ? false : '';
            current[finalKey] = new FormControl(initialValue, this.getValidators(control));
        }
    }

    // Helper method to get control by its key (resolves to actual data path location)
    getControl(
        formGroup: FormGroup,
        controlKey: string
    ): FormControl | FormArray | FormGroup | null {
        const controlMap = (formGroup as any).__controlMap as Map<string, string>;
        if (!controlMap) {
            // Fallback to direct key lookup if no map
            return formGroup.get(controlKey) as FormControl | FormArray | FormGroup | null;
        }

        const dataPath = controlMap.get(controlKey);
        if (!dataPath) {
            return null;
        }

        return formGroup.get(dataPath) as FormControl | FormArray | FormGroup | null;
    }

    // Helper to get data path for a control key
    getDataPath(formGroup: FormGroup, controlKey: string): string | null {
        const controlMap = (formGroup as any).__controlMap as Map<string, string>;
        return controlMap?.get(controlKey) || null;
    }

    // Map JSON validators to Angular Validators
    private getValidators(control: ControlDefinition): ValidatorFn[] {
        const validators: ValidatorFn[] = [];

        // Handle new style direct properties
        if (control.required) validators.push(Validators.required);
        if (control.minLength) validators.push(Validators.minLength(control.minLength));
        if (control.maxLength && control.maxLength > 0)
            validators.push(Validators.maxLength(control.maxLength));
        if (control.min !== undefined) validators.push(Validators.min(control.min));
        if (control.max !== undefined) validators.push(Validators.max(control.max));

        // Handle old style validators object
        if (control.validators) {
            const config = control.validators;
            if (config['required']) validators.push(Validators.required);
            if (config['min']) validators.push(Validators.min(config['min']));
            if (config['max']) validators.push(Validators.max(config['max']));
            if (config['minLength']) validators.push(Validators.minLength(config['minLength']));
            if (config['maxLength']) validators.push(Validators.maxLength(config['maxLength']));
            if (config['email']) validators.push(Validators.email);
            if (config['pattern']) validators.push(Validators.pattern(config['pattern']));
        }

        // Custom validators can be added here

        return validators;
    }

    // --- Data Patching & Row Creation ---

    createRowGroup(controls: ControlDefinition[]): FormGroup {
        const group: any = {};
        controls.forEach((col) => {
            // Default empty value
            group[col.key] = [''];
        });
        return this.fb.group(group);
    }

    patchForm(group: FormGroup, data: any, schema: FormSchema) {
        // 1. Handle Arrays (Tables) and nested Groups recursively
        schema.sections.forEach((section) => {
            this.patchControlsRecursively(group, data, section.controls, section.key);
        });

        // 2. Standard patch for the rest - since form structure matches data structure now,
        //    patchValue will work correctly
        group.patchValue(data);
    }

    private patchControlsRecursively(
        group: FormGroup,
        data: any,
        controls: ControlConfig[],
        parentPath?: string
    ) {
        controls.forEach((c: ControlConfig) => {
            if (typeof c === 'string') return;

            const control = c as ControlDefinition;
            const dataPath = this.resolveDataPath(control, parentPath);
            const normalizedType = this.normalizeType(control.type);

            if (normalizedType === 'table') {
                // Get the array data from the data object
                const tableData = this.getValueByPath(data, dataPath);

                if (Array.isArray(tableData)) {
                    const formArray = group.get(dataPath) as FormArray;
                    if (!formArray) return;

                    // Clear existing items
                    formArray.clear();

                    tableData.forEach((rowItem: any) => {
                        if (control.controls) {
                            const rowGroup = this.createRowGroup(
                                control.controls as ControlDefinition[]
                            );
                            rowGroup.patchValue(rowItem);
                            formArray.push(rowGroup);
                        }
                    });
                }
            } else if (normalizedType === 'group' && control.controls) {
                // Recursively handle nested group controls
                this.patchControlsRecursively(group, data, control.controls, dataPath);
            }
        });
    }

    // Helper to get nested value from object using dot notation path
    private getValueByPath(obj: any, path: string): any {
        if (!obj || !path) return undefined;

        const keys = path.split('.');
        let current = obj;

        for (const key of keys) {
            if (current && typeof current === 'object' && key in current) {
                current = current[key];
            } else {
                return undefined;
            }
        }

        return current;
    }
}
