import { Component, Input, OnInit, OnDestroy, inject, signal, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormBuilder, AbstractControl } from '@angular/forms';
import { Subscription, startWith } from 'rxjs';

// Core
import { ControlDefinition } from '../../../core/models/form-schema.interface';
import { FormGeneratorService } from '../../../core/services/form-generator.service';
import {
    getResponsiveWidthStyle,
    getResponsiveGridVars,
} from '../../../core/utils/responsive-width.util';

// Child Components
import { ExpressionEvaluatorService } from '../../../core/services/expression-evaluator.service';
import { InputControlComponent } from '../controls/input-control.component';
import { SelectControlComponent } from '../controls/select-control.component';
import { TableControlComponent } from '../controls/table/table-control.component';

@Component({
    selector: 'app-dynamic-control',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        InputControlComponent,
        SelectControlComponent,
        TableControlComponent,
    ],
    template: `
        @if (isVisible()) {
        <div class="control-wrapper responsive-col">
            @if (resolvedControl()) { @switch (normalizedType) { @case ('text') {
            <app-input-control [config]="config" [group]="wrapperGroup()!"> </app-input-control>
            } @case ('number') {
            <app-input-control [config]="config" [group]="wrapperGroup()!"> </app-input-control>
            } @case ('select') {
            <app-select-control [config]="config" [group]="wrapperGroup()!"> </app-select-control>
            } @case ('checkbox') {
            <div [formGroup]="wrapperGroup()!" class="checkbox-control">
                <input type="checkbox" [id]="config.key" [formControlName]="config.key" />
                <label [for]="config.key">{{ config.label }}</label>
            </div>
            } @case ('table') {
            <app-table-control [config]="asTableConfig(config)" [parentGroup]="wrapperGroup()!">
            </app-table-control>
            } @case ('group') {
            <div class="group-control">
                @if (config.label) {
                <fieldset class="group-fieldset">
                    <legend>{{ config.label }}</legend>
                    <div class="group-controls">
                        @for (childControl of getGroupControls(); track childControl.key) {
                        <app-dynamic-control [config]="childControl" [group]="group">
                        </app-dynamic-control>
                        }
                    </div>
                </fieldset>
                } @else {
                <div class="group-controls">
                    @for (childControl of getGroupControls(); track childControl.key) {
                    <app-dynamic-control [config]="childControl" [group]="group">
                    </app-dynamic-control>
                    }
                </div>
                }
            </div>
            } @default {
            <div class="unknown-control">Unknown type: {{ config.type }}</div>
            } } } @else {
            <div class="error-control">Control not found: {{ config.key }}</div>
            }
        </div>
        }
    `,
    styles: [
        `
            :host {
                display: contents;
                /* DEBUG: outline control host */
                outline: 1px dashed rgba(0, 0, 0, 0.03);
            }

            .control-wrapper {
                box-sizing: border-box;
                width: 100%;
                /* grid-column handled by .responsive-col */
            }

            .group-control {
                width: 100%;
            }

            .group-fieldset {
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                margin: 0;
                background: #fafafa;
            }

            .group-fieldset legend {
                font-weight: bold;
                padding: 0 5px;
            }

            .group-controls {
                display: grid;
                grid-template-columns: repeat(12, minmax(0, 1fr));
                gap: 12px;
            }

            .unknown-control,
            .error-control {
                color: red;
                font-style: italic;
                padding: 8px;
                background: #fff3cd;
                border: 1px solid #ffc107;
                border-radius: 4px;
            }
        `,
    ],
})
export class DynamicControlComponent implements OnInit, OnDestroy {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    private evaluator = inject(ExpressionEvaluatorService);
    private formGenerator = inject(FormGeneratorService);
    private sub?: Subscription;

    // Signal for visibility (Reactive UI)
    isVisible = signal<boolean>(true);

    // Resolved control from data path
    resolvedControl = signal<AbstractControl | null>(null);

    // Wrapper FormGroup to satisfy child component contracts
    wrapperGroup = signal<FormGroup | null>(null);

    // Normalized control type (case-insensitive)
    get normalizedType(): string {
        return this.config.type?.toLowerCase() || 'text';
    }

    // Get responsive width styles for this control
    getWidthStyle(): Record<string, string> {
        return getResponsiveWidthStyle(this.config.width);
    }

    asTableConfig(c: ControlDefinition): any {
        console.log('asTableConfig called', c);
        return c;
    }

    getGroupControls(): ControlDefinition[] {
        if (this.normalizedType === 'group' && this.config.controls) {
            return this.config.controls.filter((c) => typeof c !== 'string') as ControlDefinition[];
        }
        return [];
    }

    // Host grid variables
    @HostBinding('style.--col-span-xs')
    get hostColXs(): string {
        return getResponsiveGridVars(this.config.width)['--col-span-xs'];
    }

    @HostBinding('style.--col-span-md')
    get hostColMd(): string {
        return getResponsiveGridVars(this.config.width)['--col-span-md'];
    }

    @HostBinding('style.--col-span-lg')
    get hostColLg(): string {
        return getResponsiveGridVars(this.config.width)['--col-span-lg'];
    }

    ngOnInit() {
        // Resolve the actual control from data path
        const control = this.formGenerator.getControl(this.group, this.config.key);
        this.resolvedControl.set(control);

        if (!control) {
            console.warn(`Control not found for key: ${this.config.key}`);
            return;
        }

        // Create a wrapper FormGroup for child components
        // Child components expect a FormGroup with a control at config.key
        const fb = inject(FormBuilder);
        const wrapper = fb.group({
            [this.config.key]: control,
        });
        this.wrapperGroup.set(wrapper);

        // If there is no visibility rule, we are always visible.
        if (!this.config.visibleWhen) {
            return;
        }

        // LISTENER: We need to watch the ROOT form for changes.
        // Why Root? Because "visibleWhen" might depend on a field in a different section.
        // e.g. "Show State if Country (in section A) is US"
        const rootForm = this.group.root as FormGroup;

        this.sub = rootForm.valueChanges
            .pipe(
                // Trigger immediately with current value
                startWith(rootForm.value)
            )
            .subscribe((rootValue) => {
                this.evaluateVisibility(rootValue, control);
            });
    }

    private evaluateVisibility(rootModel: any, control: AbstractControl) {
        // 1. Prepare Context
        // Global context: "model.firstName"
        // We could also add local context here if needed
        const context = { model: rootModel };

        // 2. Evaluate
        const result = this.evaluator.evaluate(this.config.visibleWhen, context);

        // 3. Update Signal
        this.isVisible.set(result);

        // OPTIONAL: If invisible, should we disable the control
        // so it doesn't block form validation?
        if (control) {
            if (result) {
                control.enable({ emitEvent: false });
            } else {
                control.disable({ emitEvent: false });
            }
        }
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }
}
