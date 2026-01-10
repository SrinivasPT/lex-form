import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, forkJoin, of, catchError, tap, map } from 'rxjs';
import { FormSchema } from 'form-lib';

/**
 * Tree hierarchy node structure
 */
export interface TreeOption {
    code: string;
    displayText: string;
    parentCode?: string;
    type?: string;
    key?: string;
    level?: number;
    path?: string;
    sort_order?: number;
}

/**
 * Complete form initialization data bundle
 */
export interface FormInitData {
    schema: FormSchema;
    treeHierarchy: TreeOption[];
    formData: any;
}

/**
 * Handles all form-related data fetching operations
 * Orchestrates loading of form schemas, hierarchies, and data
 */
@Injectable({
    providedIn: 'root',
})
export class FormDataService {
    private http = inject(HttpClient);
    private baseUrl = 'http://localhost:3001';

    /**
     * Get form schema by form code
     */
    getFormSchema(formCode: string): Observable<FormSchema> {
        return this.http.get<FormSchema>(`${this.baseUrl}/form/${formCode}`).pipe(
            tap((schema) => console.log(`Schema loaded: ${formCode}`, schema)),
            catchError((err) => {
                console.error(`Error loading schema ${formCode}:`, err);
                throw err;
            })
        );
    }

    /**
     * Get tree hierarchy for a specific form or section
     */
    getTreeHierarchy(hierarchyCode: string): Observable<TreeOption[]> {
        return this.http.get<TreeOption[]>(`${this.baseUrl}/form/hierarchy/${hierarchyCode}`).pipe(
            tap((hierarchy) => console.log(`Hierarchy loaded: ${hierarchyCode}`, hierarchy)),
            catchError((err) => {
                console.error(`Error loading hierarchy ${hierarchyCode}:`, err);
                return of([]);
            })
        );
    }

    /**
     * Get form data for a specific control/record
     */
    getFormData(controlCode: string): Observable<any> {
        return this.http.get(`${this.baseUrl}/control/${controlCode}`).pipe(
            tap((data) => console.log(`Form data loaded: ${controlCode}`, data)),
            catchError((err) => {
                console.error(`Error loading form data ${controlCode}:`, err);
                return of({});
            })
        );
    }

    /**
     * Load all form initialization data in parallel
     * Ensures all required data is ready before form rendering
     */
    loadFormInitData(
        formCode: string,
        hierarchyCode: string,
        initialControlCode?: string
    ): Observable<FormInitData> {
        return forkJoin({
            schema: this.getFormSchema(formCode),
            treeHierarchy: this.getTreeHierarchy(hierarchyCode),
            formData: initialControlCode ? this.getFormData(initialControlCode) : of({}),
        }).pipe(
            tap((data) => console.log('All form data loaded:', data)),
            catchError((err) => {
                console.error('Error loading form init data:', err);
                throw err;
            })
        );
    }

    /**
     * Save form data
     */
    saveFormData(controlCode: string, data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/control/${controlCode}`, data).pipe(
            tap((response) => console.log('Form data saved:', response)),
            catchError((err) => {
                console.error('Error saving form data:', err);
                throw err;
            })
        );
    }

    /**
     * Create new form record
     */
    createFormData(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/control`, data).pipe(
            tap((response) => console.log('Form data created:', response)),
            catchError((err) => {
                console.error('Error creating form data:', err);
                throw err;
            })
        );
    }

    /**
     * Delete form record
     */
    deleteFormData(controlCode: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/control/${controlCode}`).pipe(
            tap((response) => console.log('Form data deleted:', response)),
            catchError((err) => {
                console.error('Error deleting form data:', err);
                throw err;
            })
        );
    }
}
