import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../core/services/toast.service';
import { trigger, transition, style, animate } from '@angular/animations';

/**
 * Toast container component
 * Displays toast notifications at the top-right of the screen
 */
@Component({
    selector: 'app-toast-container',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="toast-container">
            <div
                *ngFor="let toast of toastService.toasts()"
                class="toast toast-{{ toast.type }}"
                [@fadeSlide]
                (click)="toastService.remove(toast.id)"
            >
                <div class="toast-icon">
                    <span *ngIf="toast.type === 'success'">✓</span>
                    <span *ngIf="toast.type === 'error'">✕</span>
                    <span *ngIf="toast.type === 'info'">ℹ</span>
                    <span *ngIf="toast.type === 'warning'">⚠</span>
                </div>
                <div class="toast-message">{{ toast.message }}</div>
                <button class="toast-close" (click)="toastService.remove(toast.id)">×</button>
            </div>
        </div>
    `,
    styles: [
        `
            .toast-container {
                position: fixed;
                top: 20px;
                right: 20px;
                z-index: 10000;
                display: flex;
                flex-direction: column;
                gap: 8px;
                max-width: 400px;
            }

            .toast {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: white;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                cursor: pointer;
                transition: transform 0.2s;
            }

            .toast:hover {
                transform: translateX(-4px);
            }

            .toast-success {
                border-left: 4px solid #4caf50;
            }

            .toast-error {
                border-left: 4px solid #f44336;
            }

            .toast-info {
                border-left: 4px solid #2196f3;
            }

            .toast-warning {
                border-left: 4px solid #ff9800;
            }

            .toast-icon {
                font-size: 20px;
                font-weight: bold;
                flex-shrink: 0;
            }

            .toast-success .toast-icon {
                color: #4caf50;
            }

            .toast-error .toast-icon {
                color: #f44336;
            }

            .toast-info .toast-icon {
                color: #2196f3;
            }

            .toast-warning .toast-icon {
                color: #ff9800;
            }

            .toast-message {
                flex: 1;
                font-size: 14px;
                line-height: 1.4;
                color: #333;
            }

            .toast-close {
                background: none;
                border: none;
                font-size: 24px;
                line-height: 1;
                color: #999;
                cursor: pointer;
                padding: 0;
                width: 24px;
                height: 24px;
                flex-shrink: 0;
            }

            .toast-close:hover {
                color: #333;
            }
        `,
    ],
    animations: [
        trigger('fadeSlide', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateX(100%)' }),
                animate('300ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
            ]),
            transition(':leave', [
                animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' })),
            ]),
        ]),
    ],
})
export class ToastContainerComponent {
    readonly toastService = inject(ToastService);
}
