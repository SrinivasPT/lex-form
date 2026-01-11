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
    styleUrls: ['./alert.component.scss'],
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
