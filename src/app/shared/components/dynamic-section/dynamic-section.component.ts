import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormGroupDirective } from '@angular/forms';
import { FormSection, ControlDefinition } from '../../../core/models/form-schema.interface';
import { DynamicControlComponent } from '../dynamic-control/dynamic-control.component';
// We will build DynamicControlComponent next, but we import it now

@Component({
    selector: 'app-dynamic-section',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DynamicControlComponent],
    template: `
        <div [style.width]="config.width || '100%'" class="section-card">
            <fieldset class="section-fieldset">
                <legend *ngIf="config.label">{{ config.label }}</legend>

                <ng-container [formGroup]="currentGroup">
                    <ng-container *ngFor="let control of resolvedControls">
                        <app-dynamic-control [config]="control" [group]="currentGroup">
                        </app-dynamic-control>
                    </ng-container>
                </ng-container>
            </fieldset>
        </div>
    `,
    styles: [
        `
            .section-card {
                box-sizing: border-box; /* Vital for percentage widths */
                padding: 8px;
            }
            .section-fieldset {
                border: 1px solid #ddd;
                border-radius: 4px;
                padding: 10px;
                margin: 0;
                height: 100%;
                background: #fafafa;
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
