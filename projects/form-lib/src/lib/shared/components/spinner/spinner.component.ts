import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'lib-spinner',
    standalone: true,
    imports: [CommonModule],
    template: `
        @if (show) {
        <div class="spinner-container" [class.overlay]="overlay">
            <div class="spinner">
                <div class="spinner-circle"></div>
                @if (message) {
                <div class="spinner-message">{{ message }}</div>
                }
            </div>
        </div>
        }
    `,
    styles: [
        `
            .spinner-container {
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 40px;
            }

            .spinner-container.overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background-color: rgba(255, 255, 255, 0.9);
                z-index: 1000;
                padding: 0;
            }

            .spinner {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 16px;
            }

            .spinner-circle {
                width: 40px;
                height: 40px;
                border: 4px solid #f0f0f0;
                border-top-color: #3b82f6;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
            }

            @keyframes spin {
                to {
                    transform: rotate(360deg);
                }
            }

            .spinner-message {
                color: #666;
                font-size: 14px;
                font-weight: 500;
            }
        `,
    ],
})
export class SpinnerComponent {
    @Input() show = false;
    @Input() message = 'Loading...';
    @Input() overlay = false;
}
