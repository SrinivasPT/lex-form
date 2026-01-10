import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, catchError, map, tap } from 'rxjs';
import { FormSchema } from '../models/form-schema.interface';
import {
    FormContent,
    FormContentState,
    FormContentSignals,
    FormMetadata,
    TreeNode,
    DomainDataItem,
} from '../models/form-content.interface';

/**
 * Service for loading and managing form content
 * Provides consistent API for all form operations
 */
@Injectable({ providedIn: 'root' })
export class FormContentService {
    private http = inject(HttpClient);
    private baseUrl = 'http://localhost:3001/api';

    /**
     * Load complete form content including schema, data, and auxiliary data
     * Uses individual catchError to make optional data non-blocking
     * Critical: schema, metadata (will throw if failed)
     * Optional: domainData, treeData (will return empty if failed)
     */
    loadFormContent(formId: string, entityCode?: string): Observable<FormContent> {
        // Parallel load: schema + data + domain data
        return forkJoin({
            // Critical - must succeed
            schema: this.http.get<FormSchema>(`${this.baseUrl}/forms/${formId}/schema`),
            metadata: this.http.get<FormMetadata>(`${this.baseUrl}/forms/${formId}/metadata`),

            // Data load (empty object if no entityCode)
            data: entityCode
                ? this.http.get(`${this.baseUrl}/employee/${entityCode}`).pipe(
                      catchError((err) => {
                          console.warn('Form data load failed', err);
                          return of({});
                      })
                  )
                : of({}),

            // Optional - graceful degradation if these fail
            domainData: this.http
                .get<Record<string, DomainDataItem[]>>(
                    `${this.baseUrl}/forms/${formId}/domain-data`
                )
                .pipe(
                    catchError((err) => {
                        console.warn(
                            'Domain data load failed, form will work without dropdowns',
                            err
                        );
                        return of({});
                    })
                ),

            // treeData: this.http
            //     .get<TreeNode[]>(`${this.baseUrl}/forms/${formId}/tree-data`)
            //     .pipe(catchError(() => of(undefined))),
        }).pipe(
            map((result) => ({
                schema: result.schema,
                data: result.data,
                domainData: result.domainData,
                // treeData: result?.treeData,
                metadata: result.metadata,
            })),
            tap((content) => console.log('Form content loaded:', content))
        );
    }

    /**
     * Save form data
     */
    saveFormData(entityCode: string, data: any): Observable<void> {
        return this.http
            .put<void>(`${this.baseUrl}/employee/${entityCode}`, data)
            .pipe(tap(() => console.log('Form data saved:', entityCode, data)));
    }

    /**
     * Handle form edit - clears success/error messages when user starts editing
     * Call this when form valueChanges emits
     */
    handleFormEdit<T>(formState: FormContentSignals<T>): void {
        const currentState = formState.state();
        if (currentState.successMessage || currentState.actionError) {
            formState.state.update((s) => ({
                ...s,
                successMessage: null,
                actionError: null,
                actionStatus: 'idle',
            }));
        }
    }

    /**
     * Handle save operation with automatic state management
     * Updates status, calls save API, and auto-dismisses success message
     *
     * @param formState - Form state signals to update
     * @param entityCode - Entity identifier for the save endpoint
     * @param formValue - Form data to save
     * @param onSuccess - Optional callback after successful save
     * @param successMessage - Message to display on success (default: 'Data saved successfully!')
     * @param autoDismissMs - Auto-dismiss delay in milliseconds (default: 3000, 0 = no auto-dismiss)
     * @returns Observable that completes when save is done
     */
    handleSave<T>(
        formState: FormContentSignals<T>,
        entityCode: string,
        formValue: any,
        options?: {
            onSuccess?: () => void;
            successMessage?: string;
            autoDismissMs?: number;
        }
    ): Observable<void> {
        const opts = {
            successMessage: 'Data saved successfully!',
            autoDismissMs: 3000,
            ...options,
        };

        // Set saving state
        formState.state.update((s) => ({
            ...s,
            actionStatus: 'saving',
            actionError: null,
            successMessage: null,
        }));

        return this.saveFormData(entityCode, formValue).pipe(
            tap({
                next: () => {
                    // Set success state
                    formState.state.update((s) => ({
                        ...s,
                        actionStatus: 'success',
                        successMessage: opts.successMessage,
                    }));

                    // Call optional success callback
                    options?.onSuccess?.();

                    // Auto-dismiss after delay
                    if (opts.autoDismissMs > 0) {
                        setTimeout(() => {
                            formState.state.update((s) => ({
                                ...s,
                                successMessage: null,
                                actionStatus: 'idle',
                            }));
                        }, opts.autoDismissMs);
                    }
                },
                error: (err) => {
                    console.error('Save failed:', err);
                    formState.state.update((s) => ({
                        ...s,
                        actionStatus: 'error',
                        actionError: 'Failed to save data. Please try again.',
                    }));
                },
            })
        );
    }

    /**
     * Create reactive signals for form state management
     * Separates loading and action states for better UX
     */
    createFormState<T = any>(initialContent?: FormContent<T>): FormContentSignals<T> {
        const state = signal<FormContentState<T>>(
            {
                loadStatus: initialContent ? 'success' : 'idle',
                actionStatus: 'idle',
                content: initialContent || null,
                loadError: null,
                actionError: null,
                successMessage: null,
            },
            {
                // Custom equality for performance in large forms
                equal: (a, b) => JSON.stringify(a) === JSON.stringify(b),
            }
        );

        return {
            state,
            isLoading: computed(() => state().loadStatus === 'loading'),
            isSaving: computed(() => state().actionStatus === 'saving'),
            hasLoadError: computed(() => state().loadStatus === 'error'),
            hasActionError: computed(() => state().actionStatus === 'error'),
            content: computed(() => state().content),
        };
    }
}
