import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

/**
 * App Header Component
 *
 * Provides consistent header across all pages.
 * Can include branding, user info, global actions, etc.
 */
@Component({
    selector: 'app-header',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <header class="app-header">
            <div class="header-content">
                <div class="header-left">
                    <h1 class="app-title">LexForm</h1>
                    <span class="app-subtitle">Dynamic Form Builder</span>
                </div>
                <nav class="header-nav">
                    <a routerLink="/demo-app/EMP_001" routerLinkActive="active" class="nav-link"
                        >Employee 001</a
                    >
                    <a routerLink="/demo-app/EMP_002" routerLinkActive="active" class="nav-link"
                        >Employee 002</a
                    >
                    <a routerLink="/demo-control" routerLinkActive="active" class="nav-link"
                        >Demo Control</a
                    >
                    <a routerLink="/form-admin" routerLinkActive="active" class="nav-link"
                        >Form Admin</a
                    >
                </nav>
                <div class="header-right">
                    <ng-content select="[actions]"></ng-content>
                </div>
            </div>
        </header>
    `,
    styles: [
        `
            .app-header {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
                position: sticky;
                top: 0;
                z-index: 1000;
            }

            .header-content {
                max-width: 95vw;
                margin: 0 auto;
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .header-left {
                display: flex;
                align-items: baseline;
                gap: 12px;
            }

            .app-title {
                margin: 0;
                font-size: 24px;
                font-weight: 600;
                letter-spacing: -0.5px;
            }

            .app-subtitle {
                font-size: 14px;
                opacity: 0.9;
                font-weight: 300;
            }

            .header-nav {
                display: flex;
                align-items: center;
                gap: 8px;
            }

            .nav-link {
                color: white;
                text-decoration: none;
                padding: 8px 16px;
                border-radius: 4px;
                font-size: 14px;
                font-weight: 500;
                transition: background-color 0.2s;
            }

            .nav-link:hover {
                background-color: rgba(255, 255, 255, 0.1);
            }

            .nav-link.active {
                background-color: rgba(255, 255, 255, 0.2);
            }

            .header-right {
                display: flex;
                align-items: center;
                gap: 12px;
            }

            /* Responsive */
            @media (max-width: 768px) {
                .header-content {
                    padding: 12px 10px;
                    flex-wrap: wrap;
                }

                .app-title {
                    font-size: 20px;
                }

                .app-subtitle {
                    display: none;
                }

                .header-nav {
                    flex-basis: 100%;
                    margin-top: 8px;
                    gap: 4px;
                }

                .nav-link {
                    padding: 6px 12px;
                    font-size: 13px;
                }
            }
        `,
    ],
})
export class AppHeaderComponent {}
