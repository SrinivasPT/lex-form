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

    toFormGroup(schema: FormSchema): FormGroup {
        const group: any = {};

        schema.sections.forEach((section) => {
            if (section.key) {
                // Section creates a Data Scope (Nested Object)
                // e.g. "address": { ... }
                group[section.key] = this.createSectionGroup(section);
            } else {
                // Section is just Visual. Controls sit on the Root.
                // We merge them into the main group.
                this.addControlsToMap(section.controls, group);
            }
        });

        return this.fb.group(group);
    }

    private createSectionGroup(section: FormSection): FormGroup {
        const group: any = {};
        this.addControlsToMap(section.controls, group);
        return this.fb.group(group);
    }

    private addControlsToMap(controls: any[], map: any) {
        controls.forEach((control: ControlDefinition) => {
            if (control.type === 'table') {
                // Create Array
                map[control.key] = this.fb.array([], this.getValidators(control));
            } else if (control.type === 'group') {
                // Recursive Group (if you have groups inside sections)
                // implementation omitted for brevity, similar to createSectionGroup
            } else {
                // Atomic Control
                const initialValue = control.type === 'checkbox' ? false : '';
                map[control.key] = new FormControl(initialValue, this.getValidators(control));
            }
        });
    }

    // Map JSON validators to Angular Validators
    private getValidators(control: ControlDefinition): ValidatorFn[] {
        const validators: ValidatorFn[] = [];
        if (!control.validators) return validators;

        const config = control.validators;

        if (config['required']) validators.push(Validators.required);
        if (config['min']) validators.push(Validators.min(config['min']));
        if (config['max']) validators.push(Validators.max(config['max']));
        if (config['email']) validators.push(Validators.email);
        if (config['pattern']) validators.push(Validators.pattern(config['pattern']));

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
        // 1. Handle Arrays (Tables)
        schema.sections.forEach((section) => {
            this.patchSectionArrays(group, data, section);
        });

        // 2. Standard patch for the rest
        group.patchValue(data);
    }

    private patchSectionArrays(group: FormGroup, data: any, section: FormSection) {
        // Determine the data scope for this section
        const sectionData = section.key ? data?.[section.key] : data;
        const sectionGroup = section.key ? (group.get(section.key) as FormGroup) : group;

        if (!sectionData || !sectionGroup) return;

        section.controls.forEach((c: ControlConfig) => {
            // If schema is not resolved, we might encounter strings. Skip them or handle them if needed.
            // Assuming schema is resolved here.
            if (typeof c === 'string') return;

            const control = c as ControlDefinition;

            if (control.type === 'table' && Array.isArray(sectionData[control.key])) {
                const formArray = sectionGroup.get(control.key) as FormArray;
                const rowDataList = sectionData[control.key];

                // Clear existing items to avoid duplicates if called multiple times
                formArray.clear();

                rowDataList.forEach((rowItem: any) => {
                    // Create a FormGroup for this row using the table's rowConfig
                    if (control.rowConfig) {
                        const rowGroup = this.createRowGroup(
                            control.rowConfig as ControlDefinition[]
                        );
                        rowGroup.patchValue(rowItem);
                        formArray.push(rowGroup);
                    }
                });
            }
        });
    }
}
