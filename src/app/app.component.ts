import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
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

            @if (testSchema) {
            <app-dynamic-form [schema]="testSchema" [initialData]="initialValues">
            </app-dynamic-form>
            } @else {
            <p>Loading schema...</p>
            }
        </div>
    `,
})
export class AppComponent implements OnInit {
    private http = inject(HttpClient);

    testSchema: FormSchema | null = null;

    // 2. Mock Initial Data (Optional)
    initialValues = {
        firstName: 'John',
        hasNickName: false,
        address: {
            city: 'Hyderabad',
        },
    };

    ngOnInit() {
        this.http.get<FormSchema>('http://localhost:3000/schemas/EMP_001').subscribe((schema) => {
            this.testSchema = schema;
        });
    }
}
