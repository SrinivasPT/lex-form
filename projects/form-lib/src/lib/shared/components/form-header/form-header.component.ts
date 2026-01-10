import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormContentSignals } from '../../../core/models/form-content.interface';
import { AlertComponent } from '../alert/alert.component';

@Component({
    selector: 'lib-form-header',
    standalone: true,
    imports: [CommonModule, AlertComponent],
    template: `
        <!-- Header -->
        <div class="page-header">
            @if (formState.content(); as content) {
            <h1>{{ content.metadata.formName }}</h1>
            @if (content.metadata.description) {
            <p class="description">{{ content.metadata.description }}</p>
            } } @else {
            <h1>{{ loadingTitle }}</h1>
            }
        </div>

        <!-- Alerts Container -->
        <div class="alerts-container">
            <lib-alert [message]="formState.state().loadError ?? null" [type]="'error'" />
            <lib-alert [message]="formState.state().actionError ?? null" [type]="'error'" />
            <lib-alert [message]="formState.state().successMessage ?? null" [type]="'success'" />
        </div>
    `,
    styles: [
        `
            .page-header {
                margin-bottom: 24px;
            }

            .page-header h1 {
                margin: 0 0 8px 0;
                font-size: 28px;
                font-weight: 600;
                color: #1a1a1a;
            }

            .description {
                margin: 0;
                color: #666;
                font-size: 14px;
            }

            .alerts-container {
                margin-bottom: 16px;
            }
        `,
    ],
})
export class FormHeaderComponent {
    @Input({ required: true }) formState!: FormContentSignals;
    @Input() loadingTitle = 'Loading...';
}
