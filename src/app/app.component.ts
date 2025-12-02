import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { DynamicFormComponent } from './shared/components/dynamic-form/dynamic-form.component';
import { FormSchema } from './core/models/form-schema.interface';
import { Observable, catchError, of, tap } from 'rxjs';

@Component({
    selector: 'app-root',
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
export class AppComponent implements OnInit {
    private http = inject(HttpClient);

    schema$!: Observable<FormSchema | null>;
    error = signal<string | null>(null);

    // 2. Mock Initial Data (Optional)
    initialValues = {
        firstName: 'John',
        hasNickName: false,
        address: {
            city: 'Hyderabad',
        },
        dependents: [
            { name: 'Jane', relation: 'spouse', age: 30 },
            { name: 'Jimmy', relation: 'child', age: 5 },
        ],
    };

    ngOnInit() {
        console.log('AppComponent initialized, fetching schema...');
        this.schema$ = this.http.get<FormSchema>('http://localhost:3000/schemas/EMP_001').pipe(
            tap((schema) => console.log('Schema fetched:', schema)),
            catchError((err) => {
                console.error('Error fetching schema:', err);
                this.error.set(err.message || 'Unknown error');
                return of(null);
            })
        );
    }
}
