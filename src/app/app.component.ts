import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DynamicFormComponent } from './shared/components/dynamic-form/dynamic-form.component';
import { FormSchema } from './core/models/form-schema.interface';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, DynamicFormComponent],
    template: `
        <div style="padding: 20px; font-family: sans-serif;">
            <h1>Generic Form Builder (MVP)</h1>
            <hr />

            <app-dynamic-form [schema]="testSchema" [initialData]="initialValues">
            </app-dynamic-form>
        </div>
    `,
})
export class AppComponent {
    // 1. Define the Schema (JSON)
    testSchema: FormSchema = {
        code: 'EMP_001',
        version: '1.0.0',
        label: 'New Employee Registration',
        sections: [
            // SECTION 1: Basic Info (Root Scope) - Responsive width: 12 cols on mobile, 12 on tablet, 6 on desktop
            {
                label: 'Basic Information',
                width: [12], // Full width on mobile/tablet, half on desktop
                controls: [
                    // A. Dictionary Lookup (Standard) - Full width on mobile, half on tablet/desktop
                    {
                        key: 'employee.firstName',
                        width: [12],
                    },

                    // B. Dictionary Lookup + Override (Partial) - Full width on mobile, half on tablet/desktop
                    {
                        key: 'employee.lastName',
                        label: 'Surname (Overridden Label)',
                        width: [6],
                    },

                    // C. Custom Logic Control - Full width on all breakpoints
                    {
                        key: 'hasNickName',
                        type: 'checkbox',
                        label: 'Do you have a nickname?',
                        width: 6, // Single value applies to all breakpoints
                    },

                    // D. Conditional Field (Logic)
                    {
                        key: 'nickName',
                        type: 'text',
                        label: 'Nickname',
                        // LOGIC: Only show if above field is true
                        visibleWhen: 'model.hasNickName == true',
                        validators: { required: true },
                        width: [12, 8, 6], // Full on mobile, 8 cols on tablet, half on desktop
                    },
                ],
            },

            // SECTION 2: Address (Nested Scope 'address') - Responsive width
            {
                label: 'Mailing Address',
                key: 'address', // <--- Creates nested FormGroup
                width: [12], // Full width on mobile/tablet, half on desktop
                controls: [
                    {
                        key: 'street',
                        type: 'text',
                        label: 'Street Name',
                        width: 12, // Full width within section
                    },
                    {
                        key: 'city',
                        type: 'text',
                        label: 'City',
                        width: [12, 12], // Full on mobile, half on tablet & desktop (convention fills desktop)
                    },
                ],
            },
        ],
    };

    // 2. Mock Initial Data (Optional)
    initialValues = {
        firstName: 'John',
        hasNickName: false,
        address: {
            city: 'Hyderabad',
        },
    };
}
