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
                    @for (section of resolvedSchema()?.sections; track section.label || $index) {
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
                display: grid;
                grid-template-columns: repeat(12, minmax(0, 1fr));
                gap: 16px;
                width: 100%;
                box-sizing: border-box;
            }

            /* Grid children should respect host grid-column spans */
            .sections-wrapper > * {
                min-width: 0;
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
            this.formGenerator.patchForm(formGroup, this.initialData, compiled);
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
