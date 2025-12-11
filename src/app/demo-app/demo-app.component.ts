import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DynamicFormComponent, FormSchema } from 'form-lib';
import { Observable, catchError, last, of, tap } from 'rxjs';

@Component({
    selector: 'app-demo-app',
    standalone: true,
    imports: [CommonModule, DynamicFormComponent],
    template: `
        <div style="padding: 20px; font-family: sans-serif;">
            <h1>Generic Form Builder (MVP)</h1>
            <hr />

            @if (schema$ | async; as schema) {
            <app-dynamic-form [schema]="schema" [initialData]="initialValues"> </app-dynamic-form>
            } @else {
            <p>Loading schema...</p>
            @if (error()) {
            <p style="color: red">Error: {{ error() }}</p>
            } }
        </div>
    `,
})
export class DemoAppComponent implements OnInit {
    private http = inject(HttpClient);

    schema$!: Observable<FormSchema | null>;
    error = signal<string | null>(null);

    // 2. Mock Initial Data (Optional)
    initialValues = {
        id: 'EMP_001',
        firstName: 'John',
        lastName: 'Doe',
        nickName: 'Johnny',
        email: 'john.doe@example.com',
        dateOfBirth: '1985-06-15',
        isMarried: true,
        age: 38,
        about: 'A brief bio about John Doe.',
        nationality: 'IN',
        hasNickName: false,
        address: [
            {
                street: '123 Main St',
                city: 'Hyderabad',
                countryCode: 'IN',
                stateCode: 'TG',
            },
        ],
        dependents: [
            { id: 'RP_1', firstName: 'Jane', lastName: 'Doe', relation: 'spouse', age: 30 },
            { id: 'RP_2', firstName: 'Jimmy', lastName: 'Doe', relation: 'child', age: 5 },
        ],
    };

    ngOnInit() {
        console.log('DemoAppComponent initialized, fetching schema...');
        this.schema$ = this.http.get<FormSchema>('http://localhost:3001/form/employee_form').pipe(
            tap((schema) => console.log('Schema fetched:', schema)),
            catchError((err) => {
                console.error('Error fetching schema:', err);
                this.error.set(err.message || 'Unknown error');
                return of(null);
            })
        );
    }
}
