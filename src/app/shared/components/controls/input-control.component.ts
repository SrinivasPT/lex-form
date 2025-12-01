import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { ControlDefinition } from '../../../core/models/form-schema.interface';

@Component({
    selector: 'app-input-control',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
        <div [formGroup]="group" class="form-field">
            <label [for]="config.key">
                {{ config.label }}
                @if (isRequired) {
                <span class="required">*</span>
                }
            </label>

            <input
                [id]="config.key"
                [type]="config.type"
                [formControlName]="config.key"
                [placeholder]="config.placeholder || ''"
                class="form-input"
            />

            @if (hasError) {
            <div class="error-msg">Field is required</div>
            }
        </div>
    `,
    styles: [
        `
            .form-field {
                margin-bottom: 12px;
            }
            .form-input {
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
            }
            .required {
                color: red;
            }
            .error-msg {
                color: red;
                font-size: 0.8em;
                margin-top: 4px;
            }
        `,
    ],
})
export class InputControlComponent {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    get isRequired(): boolean {
        // Simple check. In a real app, check the validator functions on the control
        return !!this.config.validators?.['required'];
    }

    get hasError(): boolean {
        const control = this.group.get(this.config.key);
        return !!(control && control.invalid && control.touched);
    }
}
