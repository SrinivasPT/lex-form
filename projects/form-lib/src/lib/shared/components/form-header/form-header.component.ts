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

        <!-- Alerts Container: render only when there are messages -->
        @if (formState.state().loadError || formState.state().actionError ||
        formState.state().successMessage) {
        <div class="alerts-container">
            <lib-alert [message]="formState.state().loadError ?? null" [type]="'error'" />
            <lib-alert [message]="formState.state().actionError ?? null" [type]="'error'" />
            <lib-alert [message]="formState.state().successMessage ?? null" [type]="'success'" />
        </div>
        }
    `,
    styleUrls: ['./form-header.component.scss'],
})
export class FormHeaderComponent {
    @Input({ required: true }) formState!: FormContentSignals;
    @Input() loadingTitle = 'Loading...';
}
