import { Component, Input, OnInit, OnDestroy, inject, signal, HostBinding } from '@angular/core';
import { CommonModule, NgComponentOutlet } from '@angular/common';
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
import { DateControlComponent } from '../controls/date-control.component';
import { TableControlComponent } from '../controls/table/table-control.component';
import { TreeControlComponent } from '../controls/tree-control.component';

@Component({
    selector: 'app-dynamic-control',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, NgComponentOutlet],
    template: `
        @if (isVisible()) {
        <div class="control-wrapper responsive-col">
            @if (resolvedControl()) { @if (isComponentType()) {
            <ng-container *ngComponentOutlet="getComponent(); inputs: getInputs()"></ng-container>
            } @else { @switch (normalizedType) { @case ('checkbox') {
            <div [formGroup]="wrapperGroup()!" class="checkbox-control">
                <input type="checkbox" [id]="config.key" [formControlName]="config.key" />
                <label [for]="config.key">{{ config.label }}</label>
            </div>
            } @case ('group') {
            <div class="group-control">
                @if (config.label) {
                <fieldset class="group-fieldset">
                    <legend>{{ config.label }}</legend>
                    <div class="group-controls">
                        @for (childControl of getGroupControls(); track childControl.key) {
                        <app-dynamic-control
                            [config]="childControl"
                            [group]="getGroupForChildren()!"
                        >
                        </app-dynamic-control>
                        }
                    </div>
                </fieldset>
                } @else {
                <div class="group-controls">
                    @for (childControl of getGroupControls(); track childControl.key) {
                    <app-dynamic-control [config]="childControl" [group]="getGroupForChildren()!">
                    </app-dynamic-control>
                    }
                </div>
                }
            </div>
            } @default {
            <div class="unknown-control">Unknown type: {{ config.type }}</div>
            } } } } @else {
            <div class="error-control">Control not found: {{ config.key }}</div>
            }
        </div>
        }
    `,
    styleUrls: ['./dynamic-control.component.scss'],
})
export class DynamicControlComponent implements OnInit, OnDestroy {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    private evaluator = inject(ExpressionEvaluatorService);
    private formGenerator = inject(FormGeneratorService);
    private fb = inject(FormBuilder);
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

    isComponentType(): boolean {
        return ['text', 'number', 'date', 'select', 'table'].includes(this.normalizedType);
    }

    getComponent() {
        const map: Record<string, any> = {
            text: InputControlComponent,
            number: InputControlComponent,
            date: DateControlComponent,
            select: SelectControlComponent,
            table: TableControlComponent,
            tree: TreeControlComponent,
        };
        return map[this.normalizedType];
    }

    getInputs() {
        if (this.normalizedType === 'table') {
            return {
                config: this.asTableConfig(this.config),
                parentGroup: this.getParentGroupForTable(),
            };
        } else {
            return { config: this.config, group: this.wrapperGroup() };
        }
    }

    // Get responsive width styles for this control
    getWidthStyle(): Record<string, string> {
        return getResponsiveWidthStyle(this.config.width);
    }

    asTableConfig(c: ControlDefinition): any {
        // console.log('asTableConfig called', c);
        return c;
    }

    getGroupControls(): ControlDefinition[] {
        if (this.normalizedType === 'group' && this.config.controls) {
            return this.config.controls.filter((c) => typeof c !== 'string') as ControlDefinition[];
        }
        return [];
    }

    // For group controls, return the child FormGroup to pass to children
    getGroupForChildren(): FormGroup | null {
        if (this.normalizedType === 'group') {
            // If the group has no key, it's a logical grouping without a FormGroup - pass parent
            if (!this.config.key) {
                return this.group;
            }
            // Otherwise, pass the child FormGroup
            return this.resolvedControl() as FormGroup;
        }
        return this.group;
    }

    // For table controls, return the parent FormGroup that contains the FormArray
    getParentGroupForTable(): FormGroup | null {
        if (this.normalizedType === 'table') {
            // The resolved control is the FormArray itself
            // We need to return the group that contains it
            // For this, we need to get the parent of the FormArray
            const control = this.resolvedControl();
            if (control && control.parent) {
                return control.parent as FormGroup;
            }
        }
        return this.wrapperGroup();
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
        // For group controls without a key, skip control resolution - it's just a logical container
        if (this.normalizedType === 'group' && !this.config.key) {
            this.resolvedControl.set(this.group); // Set to current group for rendering
            this.wrapperGroup.set(this.group); // Pass through the parent group
            console.log(`[DynamicControl] Keyless group - using parent group:`, this.group);
            return;
        }

        // Resolve the actual control from data path
        const control = this.formGenerator.getControl(this.group, this.config.key);
        this.resolvedControl.set(control);

        console.log(`[DynamicControl] ${this.config.key} (${this.config.type}):`, {
            control,
            controlParent: control?.parent,
            group: this.group,
            groupValue: this.group.value,
        });

        if (!control) {
            console.warn(`Control not found for key: ${this.config.key}`);
            return;
        }

        // For child components, we need to pass the parent FormGroup that contains the control
        // NOT a wrapper, but the actual parent from the form tree
        const parentGroup = control.parent as FormGroup;
        if (parentGroup) {
            this.wrapperGroup.set(parentGroup);
            console.log(`[DynamicControl] ${this.config.key} using parent group:`, {
                parentGroup,
                parentValue: parentGroup.value,
            });
        } else {
            console.warn(`No parent group found for control: ${this.config.key}`);
        }

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
