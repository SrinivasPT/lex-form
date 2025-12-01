import { Component, Input, OnInit, HostBinding } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormGroupDirective } from '@angular/forms';
import { FormSection, ControlDefinition } from '../../../core/models/form-schema.interface';
import { DynamicControlComponent } from '../dynamic-control/dynamic-control.component';
import {
    getResponsiveWidthStyle,
    getResponsiveGridVars,
} from '../../../core/utils/responsive-width.util';

@Component({
    selector: 'app-dynamic-section',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DynamicControlComponent],
    template: `
        <div class="section-card">
            <fieldset class="section-fieldset">
                @if (config.label) {
                <legend>{{ config.label }}</legend>
                }

                <ng-container [formGroup]="currentGroup">
                    @for (control of resolvedControls; track control.key) {
                    <app-dynamic-control [config]="control" [group]="currentGroup">
                    </app-dynamic-control>
                    }
                </ng-container>
            </fieldset>
        </div>
    `,
    styles: [
        `
            :host {
                display: block;
                box-sizing: border-box;
                min-width: 0;
                grid-column: span var(--col-span-xs) !important;
                /* DEBUG: outline the section host */
                outline: 1px dashed rgba(0, 0, 0, 0.06);
            }

            @media (min-width: 768px) {
                :host {
                    grid-column: span var(--col-span-md) !important;
                }
            }

            @media (min-width: 1024px) {
                :host {
                    grid-column: span var(--col-span-lg) !important;
                }
            }

            .section-card {
                box-sizing: border-box;
                padding: 8px;
                width: 100%;
            }

            .section-fieldset {
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                margin: 0;
                height: 100%;
                background: #fafafa;
                display: grid;
                grid-template-columns: repeat(12, minmax(0, 1fr));
                gap: 12px;
            }
            legend {
                font-weight: bold;
                padding: 0 5px;
            }
        `,
    ],
})
export class DynamicSectionComponent implements OnInit {
    @Input({ required: true }) config!: FormSection;
    @Input({ required: true }) parentForm!: FormGroup;

    // This is the group that the children will bind to
    currentGroup!: FormGroup;

    // Getter to cast controls to ControlDefinition[] (they are already resolved)
    get resolvedControls(): ControlDefinition[] {
        return this.config.controls as ControlDefinition[];
    }

    // Grid variables for host element
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

    // Keep utility for backward compatibility, but it's no longer applied on an inner element
    getWidthStyle(): Record<string, string> {
        return getResponsiveWidthStyle(this.config.width);
    }

    ngOnInit() {
        if (this.config.key) {
            // SCENARIO A: Nested Data Scope (e.g. 'address')
            const nested = this.parentForm.get(this.config.key);
            if (!nested) {
                throw new Error(
                    `[DynamicSection] Could not find nested group for key: ${this.config.key}`
                );
            }
            this.currentGroup = nested as FormGroup;
        } else {
            // SCENARIO B: Visual Layout Only (controls bind to parent)
            this.currentGroup = this.parentForm;
        }
    }
}
