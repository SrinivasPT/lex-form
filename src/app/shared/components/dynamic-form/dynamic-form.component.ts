import { Component, Input, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormSchema } from '../../../core/models/form-schema.interface';
import { SchemaResolverService } from '../../../core/services/schema-resolver.service';
import { FormGeneratorService } from '../../../core/services/form-generator.service';
import { DynamicSectionComponent } from '../dynamic-section/dynamic-section.component';

@Component({
    selector: 'app-dynamic-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DynamicSectionComponent],
    template: `
        @if (form()) {
        <div class="dynamic-form-container">
            <h2>{{ resolvedSchema()?.label }}</h2>

            <form [formGroup]="form()!" (ngSubmit)="onSubmit()">
                <div class="sections-wrapper">
                    @for (section of resolvedSchema()?.sections; track section.key) {
                    <app-dynamic-section [config]="section" [parentForm]="form()!">
                    </app-dynamic-section>
                    }
                </div>

                <div class="form-actions">
                    <button type="submit" [disabled]="form()!.invalid">Submit</button>
                    <button type="button" (click)="debug()">Debug Value</button>
                </div>
            </form>
        </div>
        }
    `,
    styles: [
        `
            .sections-wrapper {
                display: flex;
                flex-wrap: wrap;
                gap: 16px;
            }
        `,
    ],
})
export class DynamicFormComponent implements OnInit {
    @Input({ required: true }) schema!: FormSchema;
    @Input() initialData?: any;

    // Services
    private resolver = inject(SchemaResolverService);
    private formGenerator = inject(FormGeneratorService);

    // State
    resolvedSchema = signal<FormSchema | null>(null);
    form = signal<FormGroup | null>(null);

    ngOnInit() {
        // 1. Compile the Schema (Dictionary Lookup + Merge)
        const compiled = this.resolver.resolve(this.schema);
        this.resolvedSchema.set(compiled);

        // 2. Generate the FormGroup
        const formGroup = this.formGenerator.toFormGroup(compiled);

        // 3. Patch Initial Data (if provided)
        if (this.initialData) {
            formGroup.patchValue(this.initialData);
        }

        this.form.set(formGroup);
    }

    onSubmit() {
        console.log('Form Submitted:', this.form()?.value);
    }

    debug() {
        console.log(JSON.stringify(this.form()?.value, null, 2));
    }
}
