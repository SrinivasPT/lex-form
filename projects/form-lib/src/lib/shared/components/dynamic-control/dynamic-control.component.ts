import {
    Component,
    Input,
    OnInit,
    OnChanges,
    OnDestroy,
    SimpleChanges,
    inject,
    signal,
    HostBinding,
    forwardRef,
} from '@angular/core';
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
import { TabGroupComponent } from '../tab-group/tab-group.component';

@Component({
    selector: 'app-dynamic-control',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        NgComponentOutlet,
        forwardRef(() => TabGroupComponent),
    ],
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
            } @case ('tab_group') {
            <app-tab-group [config]="config" [group]="group"> </app-tab-group>
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
export class DynamicControlComponent implements OnInit, OnChanges, OnDestroy {
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
        this.initializeControl();
    }

    /**
     * React to input changes when parent updates config or group.
     * Critical: Parent may patch form values without changing config reference,
     * so we also subscribe to valueChanges to catch those updates.
     */
    ngOnChanges(changes: SimpleChanges) {
        if (changes['config'] || changes['group']) {
            this.sub?.unsubscribe();
            this.initializeControl();
        }
    }

    /**
     * Initialize or re-initialize the control.
     * Handles control resolution, parent group setup, and reactive evaluations for:
     * - Static readonly property
     * - Dynamic disabledWhen expressions
     * - Dynamic visibleWhen expressions
     */
    private initializeControl() {
        // For group/tab_group controls without a key, skip control resolution - it's just a logical container
        if (
            (this.normalizedType === 'group' || this.normalizedType === 'tab_group') &&
            !this.config.key
        ) {
            this.resolvedControl.set(this.group);
            this.wrapperGroup.set(this.group);
            return;
        }

        // Resolve the actual control from data path
        const control = this.formGenerator.getControl(this.group, this.config.key);
        this.resolvedControl.set(control);

        if (!control) {
            console.warn(`Control not found for key: ${this.config.key}`);
            return;
        }

        // Set wrapper group to the control's parent for proper FormControl binding
        const parentGroup = control.parent as FormGroup;
        if (parentGroup) {
            this.wrapperGroup.set(parentGroup);
        }

        // Get root form for reactive evaluations
        const rootForm = this.group.root as FormGroup;

        // Initial evaluation of disabled state (static readonly or dynamic disabledWhen)
        this.evaluateDisabled(rootForm.value, control);

        // Clean up previous subscription
        this.sub?.unsubscribe();

        // If there are no dynamic rules AND no static readonly, we're done
        if (!this.config.visibleWhen && !this.config.disabledWhen && !this.config.readonly) {
            return;
        }

        /**
         * Subscribe to root form value changes to re-evaluate dynamic rules.
         * This handles:
         * 1. Dynamic expressions that depend on other fields (visibleWhen, disabledWhen)
         * 2. Form data updates when parent patches new values (e.g., switching between records)
         * 3. Static readonly re-evaluation when form context changes
         */
        this.sub = rootForm.valueChanges.pipe(startWith(rootForm.value)).subscribe((rootValue) => {
            if (this.config.visibleWhen) {
                this.evaluateVisibility(rootValue, control);
            }
            if (this.config.disabledWhen || this.config.readonly) {
                this.evaluateDisabled(rootValue, control);
            }
        });
    }

    private evaluateVisibility(rootModel: any, control: AbstractControl) {
        const context = { model: rootModel };
        const result = this.evaluator.evaluate(this.config.visibleWhen, context);

        this.isVisible.set(result);

        // Disable invisible controls to prevent them from blocking form validation
        if (control) {
            if (result) {
                control.enable({ emitEvent: false });
            } else {
                control.disable({ emitEvent: false });
            }
        }
    }

    /**
     * Evaluates disabled/readonly state for the control.
     * Priority: Dynamic disabledWhen expression > Static readonly property
     */
    private evaluateDisabled(rootModel: any, control: AbstractControl) {
        if (!control) return;

        const context = { model: rootModel };
        let shouldDisable = false;

        // Dynamic disabledWhen takes precedence over static readonly
        if (this.config.disabledWhen) {
            shouldDisable = this.evaluator.evaluate(this.config.disabledWhen, context);
        } else if (this.config.readonly) {
            shouldDisable = true;
        }

        // Only enable/disable if control is visible (visibility takes precedence)
        if (this.isVisible()) {
            if (shouldDisable) {
                control.disable({ emitEvent: false });
            } else {
                control.enable({ emitEvent: false });
            }
        }
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }
}
