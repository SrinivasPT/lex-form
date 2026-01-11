import { Component, inject, signal, DestroyRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormGroup } from '@angular/forms';
import { GenericFormComponent, FormAction, FormContentService } from 'form-lib';
import { CrudFormLayoutComponent } from '../shared/layout/crud-form-layout.component';
import { FormLayoutComponent } from '../shared/layout/form-layout.component';

/**
 * Demo App Component - Simplified with GenericFormComponent
 *
 * Before: 140+ lines with manual state management, loading, actions, etc.
 * After: ~40 lines - just configuration and custom handlers
 *
 * GenericFormComponent handles:
 * - Form content loading from route resolver
 * - Header with title and alerts
 * - Loading/saving states with spinner
 * - Default save/cancel actions
 * - Form state management
 */
@Component({
    selector: 'app-demo-app',
    standalone: true,
    imports: [CommonModule, GenericFormComponent, CrudFormLayoutComponent, FormLayoutComponent],
    template: `
        <!-- Page layout with header/footer -->
        <app-form-layout>
            <!-- CRUD layout provides form header, alerts, spinner -->
            <app-crud-form-layout
                [formState]="formState()"
                [showHeader]="true"
                [loadingMessage]="'Loading employee form...'"
            >
                <lib-generic-form
                    [saveSuccessMessage]="'Employee data saved successfully!'"
                    [trackByField]="'employee.id'"
                    [customActions]="customActions"
                    (formReady)="onFormReady($event)"
                    (save)="onSaveCustom($event)"
                />
            </app-crud-form-layout>
        </app-form-layout>
    `,
    styles: [],
})
export class DemoAppComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private formContentService = inject(FormContentService);
    private destroyRef = inject(DestroyRef);

    // Form state exposed to layout component
    protected formState = signal<any>(null);

    ngOnInit(): void {
        // Get form state from route data
        this.route.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
            if (data['formContent']) {
                this.formState.set(this.formContentService.createFormState(data['formContent']));
            }
        });
    }

    // Optional: Add custom actions alongside default ones
    protected readonly customActions: FormAction[] = [
        {
            label: 'Save',
            type: 'submit',
            disabled: (form: FormGroup) => form.invalid,
            handler: (form: FormGroup) => {
                console.log('Saving employee:', form.value);
                // GenericFormComponent handles the actual save
            },
            class: 'btn-primary',
        },
        {
            label: 'Debug Value',
            handler: (form: FormGroup) => this.onDebug(form),
            class: 'btn-secondary',
        },
        {
            label: 'Cancel',
            handler: () => console.log('Cancel clicked'),
            class: 'btn-secondary',
        },
    ];

    protected onFormReady(form: FormGroup): void {
        console.log('Form ready:', form);
        // Optional: Add custom form logic here
    }

    protected onSaveCustom(form: FormGroup): void {
        // Optional: Custom save handling before/after default save
        console.log('Custom save handler:', form.value);
    }

    protected onDebug(form: FormGroup): void {
        console.log('=== Form Debug Info ===');
        console.log('Form Value:', form.value);
        console.log('Form Valid:', form.valid);
        console.log('Form Dirty:', form.dirty);
        console.log('=====================');
    }
}
