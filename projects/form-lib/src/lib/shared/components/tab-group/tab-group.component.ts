import { Component, Input, forwardRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { MatTabsModule } from '@angular/material/tabs';
import { ControlDefinition, ControlConfig } from '../../../core/models/form-schema.interface';
import { DynamicControlComponent } from '../dynamic-control/dynamic-control.component';

@Component({
    selector: 'app-tab-group',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTabsModule,
        forwardRef(() => DynamicControlComponent),
    ],
    template: `
        <div class="tab-group-wrapper">
            @if (config.label) {
            <h3 class="tab-group-title">{{ config.label }}</h3>
            }

            <mat-tab-group>
                @for (section of config.controls; track $index) { @if (isControlDefinition(section))
                {
                <mat-tab>
                    <ng-template mat-tab-label>
                        {{ section.label }}
                        @if (getTabErrorCount(section) > 0) {
                        <span class="error-badge">{{ getTabErrorCount(section) }}</span>
                        }
                    </ng-template>
                    <div class="tab-content">
                        @if (section.controls) { @for (control of section.controls; track $index) {
                        @if (isControlDefinition(control)) {
                        <app-dynamic-control [config]="control" [group]="group">
                        </app-dynamic-control>
                        } } }
                    </div>
                </mat-tab>
                } }
            </mat-tab-group>
        </div>
    `,
    styles: [
        `
            .tab-group-wrapper {
                margin: 1rem 0;
                width: 100%;
            }

            .tab-group-title {
                margin-bottom: 1rem;
                font-size: 1.25rem;
                font-weight: 500;
                color: #333;
            }

            .tab-content {
                padding: 1.5rem 0;
                display: grid;
                grid-template-columns: repeat(12, minmax(0, 1fr));
                gap: 12px;
            }

            .error-badge {
                margin-left: 0.5rem;
                padding: 0.125rem 0.5rem;
                background-color: #d32f2f;
                color: white;
                border-radius: 12px;
                font-size: 0.75rem;
                font-weight: bold;
            }
        `,
    ],
})
export class TabGroupComponent {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    /**
     * Type guard to check if a ControlConfig is a ControlDefinition object
     */
    isControlDefinition(control: ControlConfig): control is ControlDefinition {
        return typeof control !== 'string';
    }

    /**
     * Count validation errors in a tab section
     */
    getTabErrorCount(section: ControlDefinition): number {
        if (!section.controls) return 0;
        return this.countErrors(section.controls as ControlDefinition[]);
    }

    private countErrors(controls: ControlDefinition[]): number {
        let count = 0;

        for (const control of controls) {
            // Handle groups recursively
            if (control.type?.toLowerCase() === 'group' && control.controls) {
                count += this.countErrors(control.controls as ControlDefinition[]);
            } else if (control.key) {
                // Try to find the control - it might be at the root or nested
                const formControl = this.findControl(this.group, control.key);
                if (formControl && formControl.invalid && formControl.touched) {
                    count++;
                }
            }
        }

        return count;
    }

    /**
     * Find a control in the form group (handles both flat and nested structures)
     */
    private findControl(group: FormGroup, key: string): any {
        // Try direct lookup first
        let control = group.get(key);
        if (control) return control;

        // Try looking in nested groups
        const controls = group.controls;
        for (const controlKey of Object.keys(controls)) {
            const nestedControl = controls[controlKey];
            if (nestedControl instanceof FormGroup) {
                control = nestedControl.get(key);
                if (control) return control;
            }
        }

        return null;
    }
}
