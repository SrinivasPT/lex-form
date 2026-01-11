import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormBuilder,
    FormGroup,
    Validators,
    AbstractControl,
} from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

export interface CreateControlDialogData {
    parentCode: string;
    atomicLevelOptions: { code: string; displayText: string }[];
    typeOptions: { code: string; displayText: string }[];
}

export interface CreateControlDialogResult {
    code: string;
    atomic_level_code: string;
    type: string;
    key?: string;
    label: string;
    sort_order?: number;
}

/**
 * Dialog for creating new SECTION/TAB/GROUP controls
 * Minimal fields: code, atomic_level, type, label
 */
@Component({
    selector: 'app-create-control-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatProgressSpinnerModule,
    ],
    template: `
        <h2 mat-dialog-title>Create New Control</h2>

        <mat-dialog-content>
            <form [formGroup]="form" class="create-control-form">
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Code</mat-label>
                    <input
                        matInput
                        formControlName="code"
                        placeholder="e.g., employee_contact_section"
                        [class.error]="form.get('code')?.invalid && form.get('code')?.touched"
                    />
                    <mat-error *ngIf="form.get('code')?.hasError('required')">
                        Code is required
                    </mat-error>
                    <mat-error *ngIf="form.get('code')?.hasError('pattern')">
                        Code must be lowercase letters, numbers, and underscores only
                    </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Atomic Level</mat-label>
                    <mat-select formControlName="atomic_level_code">
                        <mat-option
                            *ngFor="let option of data.atomicLevelOptions"
                            [value]="option.code"
                        >
                            {{ option.displayText }}
                        </mat-option>
                    </mat-select>
                    <mat-error *ngIf="form.get('atomic_level_code')?.hasError('required')">
                        Atomic Level is required
                    </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Type</mat-label>
                    <mat-select formControlName="type">
                        <mat-option *ngFor="let option of data.typeOptions" [value]="option.code">
                            {{ option.displayText }}
                        </mat-option>
                    </mat-select>
                    <mat-error *ngIf="form.get('type')?.hasError('required')">
                        Type is required
                    </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Key (Optional)</mat-label>
                    <input matInput formControlName="key" placeholder="e.g., contactInfo" />
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Label</mat-label>
                    <input
                        matInput
                        formControlName="label"
                        placeholder="e.g., Contact Information"
                        [class.error]="form.get('label')?.invalid && form.get('label')?.touched"
                    />
                    <mat-error *ngIf="form.get('label')?.hasError('required')">
                        Label is required
                    </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Sort Order</mat-label>
                    <input matInput type="number" formControlName="sort_order" placeholder="0" />
                </mat-form-field>
            </form>

            <div *ngIf="errorMessage()" class="error-message">
                {{ errorMessage() }}
            </div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button mat-button (click)="onCancel()" [disabled]="isSubmitting()">Cancel</button>
            <button
                mat-raised-button
                color="primary"
                (click)="onCreate()"
                [disabled]="form.invalid || isSubmitting()"
            >
                <mat-spinner *ngIf="isSubmitting()" diameter="20"></mat-spinner>
                <span *ngIf="!isSubmitting()">Create</span>
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .create-control-form {
                display: flex;
                flex-direction: column;
                gap: 16px;
                min-width: 400px;
                padding: 16px 0;
            }

            .full-width {
                width: 100%;
            }

            .error-message {
                color: #d32f2f;
                font-size: 14px;
                padding: 8px;
                background-color: #ffebee;
                border-radius: 4px;
                margin-top: 8px;
            }

            mat-dialog-actions {
                padding: 16px 0 0 0;
            }

            mat-spinner {
                display: inline-block;
                margin-right: 8px;
            }
        `,
    ],
})
export class CreateControlDialogComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    readonly dialogRef = inject(MatDialogRef<CreateControlDialogComponent>);
    readonly data = inject<CreateControlDialogData>(MAT_DIALOG_DATA);

    readonly isSubmitting = signal(false);
    readonly errorMessage = signal<string | null>(null);

    form!: FormGroup;

    ngOnInit(): void {
        this.form = this.fb.group({
            code: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
            atomic_level_code: ['SECTION', Validators.required],
            type: ['section', Validators.required],
            key: [''],
            label: ['', Validators.required],
            sort_order: [0],
        });
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onCreate(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        const result: CreateControlDialogResult = this.form.value;
        this.dialogRef.close(result);
    }
}
