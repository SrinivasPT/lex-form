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
    private baseUrl = 'http://localhost:3001/api';

    /**
     * Get form schema by form code
     */
    getFormSchema(formCode: string): Observable<FormSchema> {
        return this.http.get<FormSchema>(`${this.baseUrl}/forms/${formCode}/schema`).pipe(
            tap((schema) => console.log(`Schema loaded: ${formCode}`, schema)),
            catchError((err) => {
                console.error(`Error loading schema ${formCode}:`, err);
                throw err;
            }),
        );
    }

    /**
     * Get tree hierarchy for a specific form or section
     */
    getTreeHierarchy(formCode: string): Observable<TreeOption[]> {
        return this.http.get<TreeOption[]>(`${this.baseUrl}/forms/${formCode}/hierarchy`).pipe(
            tap((hierarchy) => console.log(`Hierarchy loaded: ${formCode}`, hierarchy)),
            catchError((err) => {
                console.error(`Error loading hierarchy ${formCode}:`, err);
                return of([]);
            }),
        );
    }

    /**
     * Get form data for a specific control/record
     */
    getFormData(controlCode: string): Observable<any> {
        return this.http
            .get<{ success: boolean; data: any }>(`${this.baseUrl}/controls/${controlCode}`, {
                params: { includeChildren: 'true' },
            })
            .pipe(
                map((response) => response.data),
                tap((data) => console.log(`Form data loaded: ${controlCode}`, data)),
                catchError((err) => {
                    console.error(`Error loading form data ${controlCode}:`, err);
                    return of({});
                }),
            );
    }

    /**
     * Load all form initialization data in parallel
     * Ensures all required data is ready before form rendering
     */
    loadFormInitData(
        formCode: string,
        hierarchyCode: string,
        initialControlCode?: string,
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
            }),
        );
    }

    /**
     * Save form data
     */
    saveFormData(controlCode: string, data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/controls/${controlCode}`, data).pipe(
            tap((response) => console.log('Form data saved:', response)),
            catchError((err) => {
                console.error('Error saving form data:', err);
                throw err;
            }),
        );
    }

    /**
     * Create new form record
     */
    createFormData(data: any): Observable<any> {
        return this.http.post(`${this.baseUrl}/controls`, data).pipe(
            tap((response) => console.log('Form data created:', response)),
            catchError((err) => {
                console.error('Error creating form data:', err);
                throw err;
            }),
        );
    }

    /**
     * Delete form record
     */
    deleteFormData(controlCode: string): Observable<any> {
        return this.http.delete(`${this.baseUrl}/controls/${controlCode}`).pipe(
            tap((response) => console.log('Form data deleted:', response)),
            catchError((err) => {
                console.error('Error deleting form data:', err);
                throw err;
            }),
        );
    }

    // ============================================
    // Form Admin API Methods
    // ============================================

    /**
     * Get all controls for Form Admin
     */
    getAllControls(): Observable<any[]> {
        return this.http.get<any[]>(`${this.baseUrl}/controls`).pipe(
            tap((controls) => console.log('All controls loaded:', controls)),
            catchError((err) => {
                console.error('Error loading all controls:', err);
                throw err;
            }),
        );
    }

    /**
     * Create new control (SECTION/TAB/GROUP)
     */
    createControl(controlData: any): Observable<any> {
        return this.http
            .post<{ success: boolean; data: any }>(`${this.baseUrl}/controls`, controlData)
            .pipe(
                map((response) => response.data),
                tap((data) => console.log('Control created:', data)),
                catchError((err) => {
                    console.error('Error creating control:', err);
                    throw err;
                }),
            );
    }

    /**
     * Update control metadata
     */
    updateControl(code: string, updateData: any): Observable<any> {
        return this.http
            .put<{
                success: boolean;
                data: any;
                message?: string;
            }>(`${this.baseUrl}/controls/${code}`, updateData)
            .pipe(
                map((response) => response.data),
                tap((data) => console.log('Control updated:', data)),
                catchError((err) => {
                    console.error('Error updating control:', err);
                    throw err;
                }),
            );
    }

    /**
     * Delete control (removes association for BASE, deletes control for SECTION if no dependencies)
     */
    deleteControl(code: string): Observable<any> {
        return this.http
            .delete<{
                success: boolean;
                data: any;
                message?: string;
            }>(`${this.baseUrl}/controls/${code}`)
            .pipe(
                map((response) => response.data),
                tap((data) => console.log('Control deleted:', data)),
                catchError((err) => {
                    console.error('Error deleting control:', err);
                    throw err;
                }),
            );
    }

    /**
     * Check if control can be deleted
     */
    canDeleteControl(code: string): Observable<any> {
        return this.http
            .get<{ success: boolean; data: any }>(`${this.baseUrl}/controls/${code}/can-delete`)
            .pipe(
                map((response) => response.data),
                tap((data) => console.log('Delete check:', data)),
                catchError((err) => {
                    console.error('Error checking delete eligibility:', err);
                    throw err;
                }),
            );
    }

    /**
     * Create control associations (bulk)
     */
    createControlAssociations(
        parentCode: string,
        childCodes: string[],
        dataPath?: string,
        width?: string,
    ): Observable<any> {
        const payload = {
            childControlCodes: childCodes,
            dataPath: dataPath,
            width: width,
        };
        return this.http
            .post<{
                success: boolean;
                data: any;
            }>(`${this.baseUrl}/controls/${parentCode}/children`, payload)
            .pipe(
                map((response) => response.data),
                tap((data) => console.log('Associations created:', data)),
                catchError((err) => {
                    console.error('Error creating associations:', err);
                    throw err;
                }),
            );
    }

    /**
     * Delete control association
     */
    deleteControlAssociation(parentCode: string, childCode: string): Observable<any> {
        return this.http
            .delete<{
                success: boolean;
                data: any;
                message?: string;
            }>(`${this.baseUrl}/controls/${parentCode}/children/${childCode}`)
            .pipe(
                map((response) => response.data),
                tap((data) => console.log('Association deleted:', data)),
                catchError((err) => {
                    console.error('Error deleting association:', err);
                    throw err;
                }),
            );
    }
}
