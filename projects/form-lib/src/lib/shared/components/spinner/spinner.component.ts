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
    styleUrls: ['./spinner.component.scss'],
})
export class SpinnerComponent {
    @Input() show = false;
    @Input() message = 'Loading...';
    @Input() overlay = false;
}
