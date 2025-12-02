import { Component, Input, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, switchMap, distinctUntilChanged, tap } from 'rxjs/operators';
import { of } from 'rxjs';

import { ControlDefinition } from '../../../core/models/form-schema.interface';
import { DomainData, DomainValue } from '../../../core/services/domain-data.service';

@Component({
    selector: 'app-select-control',
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

            <select
                [id]="config.key"
                [formControlName]="config.key"
                class="form-select"
                [attr.aria-busy]="loading()"
            >
                <option [ngValue]="null" disabled>
                    {{ config.placeholder || 'Select an option' }}
                </option>

                @if (loading()) {
                <option disabled>Loading...</option>
                } @else { @for (opt of options(); track opt.code) {
                <option [value]="opt.code">{{ opt.displayText }}</option>
                } @if (options().length === 0) {
                <option disabled>-- No items found --</option>
                } }
            </select>

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
            .form-select {
                width: 100%;
                padding: 8px;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-sizing: border-box;
                background-color: white;
            }
            .form-select:disabled {
                background-color: #f5f5f5;
                cursor: not-allowed;
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
export class SelectControlComponent implements OnInit {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    private domainService = inject(DomainData);
    private destroyRef = inject(DestroyRef);

    options = signal<DomainValue[]>([]);
    loading = signal<boolean>(false);

    ngOnInit() {
        // 1. Static Options
        if (this.config.options) {
            const staticOptions = this.config.options.map((o) => ({
                code: o.value,
                displayText: o.label,
            }));
            this.options.set(staticOptions);
            return;
        }

        // 2. Dynamic Options
        if (this.config.domainConfig) {
            const { categoryCode, dependentOn } = this.config.domainConfig;

            if (dependentOn) {
                const parentControl = this.group.get(dependentOn);

                if (parentControl) {
                    // Subscribe to parent changes
                    parentControl.valueChanges
                        .pipe(
                            startWith(parentControl.value), // Load initial state
                            distinctUntilChanged(),
                            tap(() => {
                                this.loading.set(true);
                                // Optional: Clear value if parent changes (unless it's the initial load)
                                // For now, we might want to keep it simple or check if current value is valid
                                // But standard behavior for dependent dropdowns is often to reset
                                // We'll handle reset logic carefully.
                                // If we are just loading, we don't want to wipe the value immediately if it might be valid,
                                // but usually a parent change invalidates the child.

                                // NOTE: We are NOT clearing the value here automatically to avoid side effects during init,
                                // but in a real app you might want to: this.group.get(this.config.key)?.setValue(null);
                            }),
                            switchMap((parentValue) => {
                                if (!parentValue) {
                                    return of([]); // Parent empty? Return empty list
                                }
                                return this.domainService.getDomainValues(
                                    categoryCode,
                                    parentValue
                                );
                            }),
                            takeUntilDestroyed(this.destroyRef)
                        )
                        .subscribe((values) => {
                            this.options.set(values);
                            this.loading.set(false);

                            // If the current value is not in the new list, we should probably clear it
                            const currentVal = this.group.get(this.config.key)?.value;
                            if (currentVal && !values.find((v) => v.code === currentVal)) {
                                this.group.get(this.config.key)?.setValue(null);
                            }
                        });
                }
            } else {
                // Load independent domain (e.g. Country)
                this.loading.set(true);
                this.domainService
                    .getDomainValues(categoryCode)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe((values) => {
                        this.options.set(values);
                        this.loading.set(false);
                    });
            }
        }
    }

    get isRequired(): boolean {
        return !!this.config.validators?.['required'];
    }

    get hasError(): boolean {
        const control = this.group.get(this.config.key);
        return !!(control && control.invalid && control.touched);
    }
}
