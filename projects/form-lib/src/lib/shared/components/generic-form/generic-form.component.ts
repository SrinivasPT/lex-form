import {
    Component,
    Input,
    Output,
    EventEmitter,
    OnInit,
    OnDestroy,
    inject,
    DestroyRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormContentService } from '../../../core/services/form-content.service';
import { FormContentSignals } from '../../../core/models/form-content.interface';
import { FormAction } from '../../../core/models/form-schema.interface';
import { DynamicFormComponent } from '../dynamic-form/dynamic-form.component';
import { FormHeaderComponent } from '../form-header/form-header.component';
import { SpinnerComponent } from '../spinner/spinner.component';

export interface GenericFormConfig {
    /** Form ID to load from backend */
    formId?: string;
    /** Entity/record ID to load data for (optional for new records) */
    entityCode?: string;
    /** Show form header with title and alerts */
    showHeader?: boolean;
    /** Custom save message */
    saveSuccessMessage?: string;
    /** Auto-dismiss success message delay in ms (0 = no auto-dismiss) */
    autoDismissMs?: number;
    /** Custom form actions (if not provided, uses default Save/Debug actions) */
    customActions?: FormAction[];
}

/**
 * Generic Form Component - High-level wrapper for complete CRUD forms
 *
 * Encapsulates:
 * - Form content loading (schema + data + domain data)
 * - Header with title and alerts
 * - Loading/saving states with spinner
 * - Standard CRUD actions (save, cancel, delete)
 * - Route integration for form/entity IDs
 *
 * Usage Examples:
 * ```html
 * <!-- Load from route data (requires resolver) -->
 * <lib-generic-form (save)="onSave($event)" />
 *
 * <!-- Load by IDs -->
 * <lib-generic-form
 *   [formId]="'employee-form'"
 *   [entityCode]="'EMP_001'"
 *   (save)="onSave($event)"
 * />
 *
 * <!-- Custom configuration -->
 * <lib-generic-form
 *   [config]="{formId: 'employee-form', showHeader: true, customActions: myActions}"
 *   (save)="onSave($event)"
 *   (cancel)="onCancel()"
 * />
 * ```
 *
 * For custom scenarios, use DynamicFormComponent directly instead.
 */
@Component({
    selector: 'lib-generic-form',
    standalone: true,
    imports: [CommonModule, DynamicFormComponent, FormHeaderComponent, SpinnerComponent],
    template: `
        <div class="generic-form-container">
            @if (showHeader) {
            <lib-form-header [formState]="formState" [loadingTitle]="'Loading form...'" />
            }

            <!-- Loading Spinner -->
            <div class="content-area">
                <lib-spinner
                    [show]="formState.isLoading()"
                    [message]="'Loading form...'"
                    [overlay]="false"
                />

                <!-- Form Content -->
                @if (formState.content(); as content) {
                <div class="form-wrapper">
                    <!-- Key tracking for form reset on entity change -->
                    @for (item of [content]; track getTrackingValue(item.data)) {
                    <app-dynamic-form
                        [schema]="content.schema"
                        [initialData]="content.data"
                        [actions]="resolvedActions"
                        (formReady)="onFormReady($event)"
                    />
                    }
                </div>
                }

                <!-- Load Error -->
                @if (formState.hasLoadError()) {
                <div class="error-container">
                    <p class="error-message">{{ formState.state().loadError }}</p>
                </div>
                }
            </div>
        </div>
    `,
    styleUrls: ['./generic-form.component.scss'],
})
export class GenericFormComponent implements OnInit {
    // Inputs - can provide either config object or individual properties
    @Input() config?: GenericFormConfig;
    @Input() formId?: string;
    @Input() entityCode?: string;
    @Input() showHeader = true;
    @Input() saveSuccessMessage = 'Data saved successfully!';
    @Input() autoDismissMs = 3000;
    @Input() customActions?: FormAction[];
    @Input() trackByField = 'id'; // Field to use for tracking entity changes

    // Outputs
    @Output() save = new EventEmitter<FormGroup>();
    @Output() cancel = new EventEmitter<void>();
    @Output() formReady = new EventEmitter<FormGroup>();

    // Services
    private route = inject(ActivatedRoute);
    private formContentService = inject(FormContentService);
    private destroyRef = inject(DestroyRef);

    // State
    protected formState!: FormContentSignals;
    private currentForm?: FormGroup;

    // Resolved configuration
    private get resolvedConfig(): {
        formId: string;
        entityCode?: string;
        showHeader: boolean;
        saveSuccessMessage: string;
        autoDismissMs: number;
    } {
        const config = this.config || {};
        return {
            formId: config.formId || this.formId || '',
            entityCode: config.entityCode || this.entityCode,
            showHeader: config.showHeader ?? this.showHeader,
            saveSuccessMessage: config.saveSuccessMessage || this.saveSuccessMessage,
            autoDismissMs: config.autoDismissMs ?? this.autoDismissMs,
        };
    }

    protected get resolvedActions(): FormAction[] {
        if (this.customActions || this.config?.customActions) {
            return this.customActions || this.config!.customActions!;
        }

        // Default actions
        return [
            {
                label: 'Save',
                type: 'submit',
                disabled: (form) => form.invalid || this.formState.isSaving(),
                handler: (form) => this.handleSave(form),
                class: 'btn-primary',
            },
            {
                label: 'Cancel',
                handler: () => this.handleCancel(),
                class: 'btn-secondary',
            },
        ];
    }

    ngOnInit(): void {
        // Check if form content is provided via route resolver
        this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
            if (data['formContent']) {
                // Content provided by resolver
                this.formState = this.formContentService.createFormState(data['formContent']);
            } else {
                // Load content directly
                this.loadFormContent();
            }
        });
    }

    /**
     * Get tracking value from data using trackByField path
     * Supports nested paths like 'employee.id'
     */
    protected getTrackingValue(data: any): string | number {
        if (!data || !this.trackByField) return 'new';

        // Handle nested paths (e.g., 'employee.id')
        const parts = this.trackByField.split('.');
        let value = data;

        for (const part of parts) {
            value = value?.[part];
            if (value === undefined || value === null) {
                return 'new';
            }
        }

        return value || 'new';
    }

    private loadFormContent(): void {
        const config = this.resolvedConfig;

        if (!config.formId) {
            console.error('GenericFormComponent: formId is required');
            this.formState = this.formContentService.createFormState();
            this.formState.state.update((s) => ({
                ...s,
                loadStatus: 'error',
                loadError: 'Form ID is required',
            }));
            return;
        }

        // Initialize loading state
        this.formState = this.formContentService.createFormState();
        this.formState.state.update((s) => ({
            ...s,
            loadStatus: 'loading',
        }));

        // Load form content
        this.formContentService
            .loadFormContent(config.formId, config.entityCode)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (content) => {
                    this.formState.state.update((s) => ({
                        ...s,
                        loadStatus: 'success',
                        content,
                        loadError: null,
                    }));
                },
                error: (err) => {
                    console.error('Failed to load form content:', err);
                    this.formState.state.update((s) => ({
                        ...s,
                        loadStatus: 'error',
                        loadError: 'Failed to load form. Please try again.',
                    }));
                },
            });
    }

    protected onFormReady(form: FormGroup): void {
        this.currentForm = form;
        this.formReady.emit(form);

        // Clear success/error messages when user starts editing
        form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.formContentService.handleFormEdit(this.formState);
        });
    }

    private handleSave(form: FormGroup): void {
        if (!this.currentForm || form.invalid) return;

        const config = this.resolvedConfig;
        const content = this.formState.content();

        if (!content) {
            console.error('Cannot save: no form content loaded');
            return;
        }

        // Extract entity ID from form data (try common patterns)
        const formValue = form.value;
        const entityCode =
            config.entityCode ||
            formValue?.id ||
            formValue?.code ||
            formValue?.[Object.keys(formValue)[0]]?.id ||
            'NEW';

        // Emit save event for custom handling
        this.save.emit(form);

        // Perform default save operation
        this.formContentService
            .handleSave(this.formState, entityCode, formValue, {
                onSuccess: () => form.markAsPristine(),
                successMessage: config.saveSuccessMessage,
                autoDismissMs: config.autoDismissMs,
            })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }

    private handleCancel(): void {
        this.cancel.emit();

        // Reset form to pristine state if available
        if (this.currentForm) {
            this.currentForm.reset(this.formState.content()?.data);
        }
    }
}
