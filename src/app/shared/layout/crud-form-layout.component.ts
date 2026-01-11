import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormContentSignals } from '../../../../projects/form-lib/src/lib/core/models/form-content.interface';
import { FormHeaderComponent } from '../../../../projects/form-lib/src/lib/shared/components/form-header/form-header.component';
import { SpinnerComponent } from '../../../../projects/form-lib/src/lib/shared/components/spinner/spinner.component';

/**
 * CRUD Form Layout Component
 *
 * Provides consistent layout and UI chrome for all CRUD forms in the application.
 * Handles:
 * - Page layout (centering, max-width, padding)
 * - Header with title and alerts
 * - Loading spinner overlay
 * - Error display
 *
 * Usage:
 * ```html
 * <app-crud-form-layout
 *   [formState]="formState"
 *   [showHeader]="true"
 *   [loadingMessage]="'Loading employee...'"
 * >
 *   <!-- Your custom form content goes here -->
 *   <form [formGroup]="myForm">
 *     <!-- custom fields -->
 *   </form>
 * </app-crud-form-layout>
 * ```
 *
 * Benefits:
 * - Developers don't need to reimplement header, spinner, alerts
 * - Consistent look and feel across all forms
 * - Easy to update styling globally
 */
@Component({
    selector: 'app-crud-form-layout',
    standalone: true,
    imports: [CommonModule, FormHeaderComponent, SpinnerComponent],
    template: `
        <div class="crud-form-layout">
            <!-- Form Header with Title and Alerts -->
            @if (showHeader && formState) {
            <lib-form-header [formState]="formState" [loadingTitle]="loadingMessage" />
            }

            <!-- Content Area with Spinner Overlay -->
            <div class="content-area">
                <!-- Loading Spinner -->
                @if (formState) {
                <lib-spinner
                    [show]="formState.isLoading()"
                    [message]="loadingMessage"
                    [overlay]="false"
                />
                }

                <!-- Custom Form Content (projected) -->
                @if (!formState || !formState.hasLoadError()) {
                <div class="form-content">
                    <ng-content></ng-content>
                </div>
                }

                <!-- Load Error -->
                @if (formState?.hasLoadError()) {
                <div class="error-container">
                    <p class="error-message">{{ formState?.state()?.loadError }}</p>
                </div>
                }
            </div>
        </div>
    `,
    styles: [
        `
            .crud-form-layout {
                max-width: 100%; /* inherit container width from page layout */
                margin: 0;
                padding: 0; /* no padding - let content control its own spacing */
            }

            .content-area {
                position: relative;
                min-height: 200px;
            }

            .form-content {
                /* Container for projected content */
            }

            .error-container {
                background: #fff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 24px;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            }

            .error-message {
                color: #d32f2f;
                margin: 0;
                text-align: center;
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .crud-form-layout {
                    padding: 10px;
                }
            }
        `,
    ],
})
export class CrudFormLayoutComponent {
    /** Form state for header, alerts, and spinner */
    @Input() formState?: FormContentSignals;

    /** Show the form header with title and alerts */
    @Input() showHeader = true;

    /** Loading message for spinner */
    @Input() loadingMessage = 'Loading...';
}
