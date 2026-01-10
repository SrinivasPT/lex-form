import { inject, Injectable } from '@angular/core';
import { Router, Resolve, ActivatedRouteSnapshot } from '@angular/router';
import { Observable, of, catchError } from 'rxjs';
import { FormContent } from '../models/form-content.interface';
import { FormContentService } from '../services/form-content.service';

/**
 * Route resolver that loads complete form content before navigation
 * Usage in routes:
 *   { path: 'employee-form/:id', resolve: { formContent: FormContentResolver } }
 *
 * Error Handling Strategy:
 * - Auth/404/500 errors: Redirect to error page (hard failures)
 * - Validation/partial load errors: Return FormContent with error state
 */
@Injectable({ providedIn: 'root' })
export class FormContentResolver implements Resolve<FormContent | null> {
    private router = inject(Router);
    private formContentService = inject(FormContentService);

    resolve(route: ActivatedRouteSnapshot): Observable<FormContent | null> {
        const formId = route.paramMap.get('formId') || route.data['formId'];
        const entityCode = route.paramMap.get('id');

        if (!formId) {
            console.error('No formId provided for FormContentResolver');
            return of(null);
        }

        return this.formContentService.loadFormContent(formId, entityCode || undefined).pipe(
            catchError((error) => {
                console.error('Failed to load form content', error);

                // Hard failures: redirect to error page
                if (error.status === 404 || error.status === 403 || error.status === 500) {
                    this.router.navigate(['/error'], {
                        queryParams: {
                            message: error.message,
                            code: error.status,
                        },
                    });
                    return of(null);
                }

                // Soft failures: return error state in FormContent
                // Component can still render with error UI
                return of(this.createErrorFormContent(error));
            })
        );
    }

    private createErrorFormContent(error: any): FormContent {
        return {
            schema: {
                code: 'error',
                version: '1.0',
                label: 'Error',
                sections: [],
            },
            data: {},
            metadata: { formId: 'error', formName: 'Error Loading Form' },
        };
    }
}
