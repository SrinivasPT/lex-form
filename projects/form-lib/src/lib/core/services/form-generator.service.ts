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
        const controlMap = new Map<string, string>(); // controlKey -> dataPath

        // Sections are just controls - treat them uniformly
        const structure = this.buildControls(schema.sections as any[], controlMap, '');

        const formGroup = this.fb.group(structure);
        // Attach metadata to FormGroup for later reference
        (formGroup as any).__controlMap = controlMap;
        (formGroup as any).__schema = schema;

        return formGroup;
    }

    /**
     * Recursively build controls structure
     * Everything is a control - sections, groups, inputs, etc.
     */
    private buildControls(
        controls: ControlConfig[],
        controlMap: Map<string, string>,
        parentPath: string
    ): any {
        const structure: any = {};

        controls.forEach((c: ControlConfig) => {
            if (typeof c === 'string') return;
            const control = c as ControlDefinition;

            const normalizedType = this.normalizeType(control.type);

            // For groups without a key, don't create a nested structure - flatten into parent
            if (normalizedType === 'group' && !control.key && control.controls) {
                // Flatten: merge children directly into current structure
                const childStructure = this.buildControls(control.controls, controlMap, parentPath);
                Object.assign(structure, childStructure);
                return;
            }

            // Skip controls without key (except groups which are handled above)
            if (!control.key) return;

            // Calculate data path
            const dataPath = control.dataPath
                ? control.dataPath
                : parentPath
                ? `${parentPath}.${control.key}`
                : control.key;

            // Store in map
            controlMap.set(control.key, dataPath);

            // Build the control based on type
            if (normalizedType === 'group' && control.controls) {
                // GROUP: Recursively build children
                structure[control.key] = this.fb.group(
                    this.buildControls(control.controls, controlMap, dataPath)
                );
            } else if (normalizedType === 'table') {
                // TABLE: FormArray
                structure[control.key] = this.fb.array([], this.getValidators(control));
            } else {
                // BASE CONTROL: FormControl
                const initialValue = normalizedType === 'checkbox' ? false : '';
                structure[control.key] = new FormControl(initialValue, this.getValidators(control));
            }
        });

        return structure;
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

    createRowGroup(controls?: ControlDefinition[]): FormGroup {
        const group: any = {};

        if (!controls || controls.length === 0) {
            // Return empty group if no controls defined
            console.warn(
                'Table control has no column definitions (controls property is empty or undefined)'
            );
            return this.fb.group(group);
        }

        controls.forEach((col) => {
            // Default empty value
            const normalizedType = this.normalizeType(col.type);
            const initialValue = normalizedType === 'checkbox' ? false : '';
            group[col.key] = [initialValue, this.getValidators(col)];
        });
        return this.fb.group(group);
    }

    patchForm(group: FormGroup, data: any, schema: FormSchema) {
        // Recursively patch tables and groups, then patch values
        this.patchControlsRecursively(group, data, schema.sections as any[]);

        // Standard patch for all controls
        group.patchValue(data);
    }

    private patchControlsRecursively(group: FormGroup, data: any, controls: ControlConfig[]) {
        controls.forEach((c: ControlConfig) => {
            if (typeof c === 'string') return;

            const control = c as ControlDefinition;
            if (!control.key) return;

            const normalizedType = this.normalizeType(control.type);

            if (normalizedType === 'table') {
                // Handle table (FormArray) - needs special patching
                const tableData = data?.[control.key];

                if (Array.isArray(tableData)) {
                    const formArray = group.get(control.key) as FormArray;
                    if (!formArray) return;

                    // Clear and repopulate
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
                // Recursively patch nested groups
                const nestedGroup = group.get(control.key) as FormGroup;
                if (nestedGroup && data?.[control.key]) {
                    this.patchControlsRecursively(nestedGroup, data[control.key], control.controls);
                }
            }
        });
    }
}
