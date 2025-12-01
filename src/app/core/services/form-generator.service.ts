import { Injectable, inject } from '@angular/core';
import {
    FormBuilder,
    FormGroup,
    FormControl,
    FormArray,
    Validators,
    ValidatorFn,
} from '@angular/forms';
import { FormSchema, FormSection, ControlDefinition } from '../models/form-schema.interface';

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
}
