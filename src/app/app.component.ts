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
            // SECTION 1: Basic Info (Root Scope)
            {
                label: 'Basic Information',
                width: '100%',
                controls: [
                    // A. Dictionary Lookup (Standard)
                    'employee.firstName',

                    // B. Dictionary Lookup + Override (Partial)
                    {
                        key: 'employee.lastName',
                        label: 'Surname (Overridden Label)',
                    },

                    // C. Custom Logic Control
                    {
                        key: 'hasNickName',
                        type: 'checkbox', // You might need to add 'checkbox' to input-control or use text for now if not impl
                        label: 'Do you have a nickname?',
                        // Temporary hack: if InputControl doesn't support checkbox yet,
                        // use a standard text input and type "true" to test logic
                    },

                    // D. Conditional Field (Logic)
                    {
                        key: 'nickName',
                        type: 'text',
                        label: 'Nickname',
                        // LOGIC: Only show if above field is true
                        visibleWhen: 'model.hasNickName == true',
                        validators: { required: true },
                    },
                ],
            },

            // SECTION 2: Address (Nested Scope 'address')
            {
                label: 'Mailing Address',
                key: 'address', // <--- Creates nested FormGroup
                width: '100%',
                controls: [
                    {
                        key: 'street',
                        type: 'text',
                        label: 'Street Name',
                    },
                    {
                        key: 'city',
                        type: 'text',
                        label: 'City',
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
