import { Component, inject, OnInit, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
    TreeControlComponent,
    ControlDefinition,
    DynamicFormComponent,
    FormSchema,
    FormAction,
} from 'form-lib';
import { FormDataService, TreeOption } from '../core/services/form-data.service';
import { tap, catchError, of, switchMap, filter, distinctUntilChanged } from 'rxjs';

@Component({
    selector: 'app-form-admin-control',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TreeControlComponent, DynamicFormComponent],
    templateUrl: './form-admin-control.component.html',
    styleUrls: ['./form-admin-control.component.scss'],
})
export class FormAdminControlComponent implements OnInit {
    private readonly formDataService = inject(FormDataService);
    private readonly fb = inject(FormBuilder);
    private readonly destroyRef = inject(DestroyRef);
    private loadingTimeout?: number;

    protected formGroup!: FormGroup;
    protected readonly form = signal<FormGroup | null>(null);
    protected readonly isInitialLoading = signal(true);
    protected readonly isFormDataLoading = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly successMessage = signal<string | null>(null);
    protected readonly schema = signal<FormSchema | null>(null);
    protected readonly initialValues = signal<Record<string, any>>({});
    protected readonly selectedNodeCode = signal<string | null>(null);
    protected readonly treeConfig = signal<ControlDefinition>({
        key: 'treeField',
        type: 'tree',
        label: 'Select from Tree',
        options: [],
    });

    protected readonly formActions: FormAction[] = [
        {
            label: 'Save',
            type: 'submit',
            disabled: (form) => form.invalid || this.isFormDataLoading(),
            handler: (form) => this.onSave(form),
            class: 'btn-primary',
        },
        {
            label: 'Reset',
            type: 'reset',
            handler: (form) => this.onReset(form),
            class: 'btn-secondary',
        },
    ];

    ngOnInit(): void {
        this.loadInitialFormData();
    }

    /**
     * Load all initial form data in parallel using forkJoin
     */
    private loadInitialFormData(): void {
        this.isInitialLoading.set(true);
        this.error.set(null);
        this.successMessage.set(null);

        this.formDataService
            .loadFormInitData('control_form', 'employee_section', 'control.table')
            .pipe(
                tap((data) => {
                    this.treeConfig.set({
                        key: 'treeField',
                        type: 'tree',
                        label: 'Select from Tree',
                        options: data.treeHierarchy as any,
                    });
                    this.formGroup = this.fb.group({ treeField: ['control.table'] });
                    this.setupTreeSelectionListener();
                    this.schema.set(data.schema);
                    this.initialValues.set(data.formData);
                    this.selectedNodeCode.set('control.table');
                    this.isInitialLoading.set(false);
                }),
                catchError((err) => {
                    console.error('Failed to load form configuration', err);
                    this.error.set('Failed to load form. Please refresh the page.');
                    this.isInitialLoading.set(false);
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe();
    }

    /**
     * Setup reactive listener for tree selection changes
     * Uses switchMap to cancel previous requests when selection changes quickly
     * Delays loading indicator to prevent flickering on fast loads
     */
    private setupTreeSelectionListener(): void {
        this.formGroup
            .get('treeField')
            ?.valueChanges.pipe(
                filter((value) => value != null),
                distinctUntilChanged(),
                tap((selectedCode) => {
                    this.selectedNodeCode.set(selectedCode);
                    this.error.set(null);
                    this.successMessage.set(null);
                    this.loadingTimeout = window.setTimeout(
                        () => this.isFormDataLoading.set(true),
                        300
                    );
                }),
                switchMap((selectedCode) =>
                    this.formDataService.getFormData(selectedCode).pipe(
                        catchError((err) => {
                            console.error('Failed to load form data', err);
                            this.error.set('Failed to load form data.');
                            return of({});
                        })
                    )
                ),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe((data) => {
                if (this.loadingTimeout) {
                    clearTimeout(this.loadingTimeout);
                    this.loadingTimeout = undefined;
                }
                this.initialValues.set(data);
                this.isFormDataLoading.set(false);
                this.form()?.patchValue(data);
            });
    }

    protected onFormReady(form: FormGroup): void {
        this.form.set(form);
    }

    protected onSave(form: FormGroup): void {
        const selectedCode = this.selectedNodeCode();
        if (!selectedCode || form.invalid) return;

        this.error.set(null);
        this.successMessage.set(null);
        this.isFormDataLoading.set(true);

        this.formDataService
            .saveFormData(selectedCode, form.value)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.successMessage.set('Form saved successfully!');
                    form.markAsPristine();
                    this.isFormDataLoading.set(false);
                    setTimeout(() => this.successMessage.set(null), 3000);
                },
                error: (err) => {
                    console.error('Failed to save form', err);
                    this.error.set('Failed to save form. Please try again.');
                    this.isFormDataLoading.set(false);
                },
            });
    }

    protected onReset(form: FormGroup): void {
        form.reset();
        const initValues = this.initialValues();
        if (initValues && Object.keys(initValues).length > 0) {
            form.patchValue(initValues);
        }
    }
}
