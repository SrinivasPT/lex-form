import { Component, Input, OnInit, Output, EventEmitter, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { FormSchema, FormAction } from '../../../core/models/form-schema.interface';
import { SchemaResolverService } from '../../../core/services/schema-resolver.service';
import { FormGeneratorService } from '../../../core/services/form-generator.service';
import { DynamicControlComponent } from '../dynamic-control/dynamic-control.component';

@Component({
    selector: 'app-dynamic-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DynamicControlComponent],
    template: `
        @if (form()) {
        <div class="dynamic-form-container">
            <h2>{{ resolvedSchema()?.label }}</h2>

            <form [formGroup]="form()!" (ngSubmit)="onSubmit()">
                <div class="sections-wrapper">
                    @for (section of resolvedSchema()?.sections; track section.key || $index) {
                    <!-- Sections are just controls, treat them uniformly -->
                    <app-dynamic-control [config]="section" [group]="form()!">
                    </app-dynamic-control>
                    }
                </div>

                @if (actions.length > 0) {
                <div class="form-actions">
                    @for (action of actions; track action.label) {
                    <button
                        [type]="action.type || 'button'"
                        [disabled]="action.disabled?.(form()!)"
                        [class]="action.class || ''"
                        (click)="action.type !== 'submit' && handleAction(action)"
                    >
                        {{ action.label }}
                    </button>
                    }
                </div>
                }
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
    @Input() actions: FormAction[] = [];
    @Output() formReady = new EventEmitter<FormGroup>();

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
        this.formReady.emit(formGroup);
    }

    onSubmit() {
        const submitAction = this.actions.find((a) => a.type === 'submit');
        if (submitAction && this.form()) {
            submitAction.handler(this.form()!);
        }
    }

    handleAction(action: FormAction) {
        if (this.form()) {
            action.handler(this.form()!);
        }
    }
}
