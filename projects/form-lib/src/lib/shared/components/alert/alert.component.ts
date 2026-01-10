import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

export type AlertType = 'success' | 'error' | 'warning' | 'info';

@Component({
    selector: 'lib-alert',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (message) {
        <div class="alert alert-{{ type }}" role="alert">
            <span class="alert-icon">{{ icon }}</span>
            <span class="alert-message">{{ message }}</span>
        </div>
        }
    `,
    styles: [
        `
            .alert {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                margin-bottom: 16px;
                border-radius: 6px;
                font-size: 14px;
                line-height: 1.5;
                border: 1px solid;
                animation: slideIn 0.3s ease-out;
            }

            @keyframes slideIn {
                from {
                    opacity: 0;
                    transform: translateY(-10px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .alert-icon {
                font-size: 18px;
                flex-shrink: 0;
            }

            .alert-message {
                flex: 1;
            }

            .alert-success {
                background-color: #d4edda;
                border-color: #c3e6cb;
                color: #155724;
            }

            .alert-error {
                background-color: #f8d7da;
                border-color: #f5c6cb;
                color: #721c24;
            }

            .alert-warning {
                background-color: #fff3cd;
                border-color: #ffeeba;
                color: #856404;
            }

            .alert-info {
                background-color: #d1ecf1;
                border-color: #bee5eb;
                color: #0c5460;
            }
        `,
    ],
})
export class AlertComponent {
    @Input() message: string | null = null;
    @Input() type: AlertType = 'info';

    get icon(): string {
        switch (this.type) {
            case 'success':
                return '✓';
            case 'error':
                return '✕';
            case 'warning':
                return '⚠';
            case 'info':
                return 'ℹ';
            default:
                return '';
        }
    }
}
