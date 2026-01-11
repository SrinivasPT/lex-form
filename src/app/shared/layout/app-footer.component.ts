import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

/**
 * App Footer Component
 *
 * Provides consistent footer across all pages.
 * Can include copyright, links, version info, etc.
 */
@Component({
    selector: 'app-footer',
    standalone: true,
    imports: [CommonModule],
    template: `
        <footer class="app-footer">
            <div class="footer-content">
                <div class="footer-left">
                    <p class="copyright">&copy; {{ currentYear }} LexForm. All rights reserved.</p>
                </div>
                <div class="footer-right">
                    <ng-content select="[links]"></ng-content>
                    <span class="version">v1.0.0</span>
                </div>
            </div>
        </footer>
    `,
    styles: [
        `
            .app-footer {
                background: #f5f5f5;
                border-top: 1px solid #e0e0e0;
                margin-top: auto;
            }

            .footer-content {
                max-width: 95vw;
                margin: 0 auto;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .footer-left,
            .footer-right {
                display: flex;
                align-items: center;
                gap: 16px;
            }

            .copyright {
                margin: 0;
                font-size: 14px;
                color: #666;
            }

            .version {
                font-size: 12px;
                color: #999;
                padding: 4px 8px;
                background: #fff;
                border-radius: 4px;
                border: 1px solid #e0e0e0;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .footer-content {
                    flex-direction: column;
                    gap: 12px;
                    padding: 12px 10px;
                    text-align: center;
                }

                .copyright {
                    font-size: 12px;
                }
            }
        `,
    ],
})
export class AppFooterComponent {
    protected readonly currentYear = new Date().getFullYear();
}
