import { Component } from '@angular/core';
import { AppHeaderComponent } from './app-header.component';
import { AppFooterComponent } from './app-footer.component';

/**
 * Form Layout Component
 *
 * Provides consistent page layout for forms across the application.
 * Handles centering, max-width, and responsive padding.
 *
 * The library components (form-lib) remain layout-agnostic and fill 100% of their container.
 * This component defines the "where" (layout context), while the library defines the "how" (functionality).
 */
@Component({
    selector: 'app-form-layout',
    standalone: true,
    imports: [AppHeaderComponent, AppFooterComponent],
    template: `
        <div class="page-layout">
            <app-header>
                <ng-content select="[header-actions]"></ng-content>
            </app-header>

            <main class="main-content">
                <div class="form-layout-container">
                    <ng-content></ng-content>
                </div>
            </main>

            <app-footer>
                <ng-content select="[footer-links]"></ng-content>
            </app-footer>
        </div>
    `,
    styles: [
        `
            :host {
                display: flex;
                flex-direction: column;
                min-height: 100vh;
            }

            .page-layout {
                display: flex;
                flex-direction: column;
                min-height: 100vh;
            }

            .main-content {
                flex: 1;
            }

            .form-layout-container {
                max-width: 100vw;
                margin: 0 auto;
                padding: 0 12px; /* zero top/bottom, keep side padding for alignment */
            }

            /* Responsive adjustments */
            @media (max-width: 768px) {
                .form-layout-container {
                    padding: 10px;
                }
            }
        `,
    ],
})
export class FormLayoutComponent {}
