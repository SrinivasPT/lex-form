import { Component, inject, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormControl } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { SelectionModel } from '@angular/cdk/collections';

export interface Control {
    code: string;
    atomicLevelCode: string;
    type: string;
    key?: string;
    label: string;
    sortOrder?: number;
}

export interface AssociateControlsDialogData {
    parentCode: string;
    parentLabel: string;
    availableControls: Control[];
    existingChildCodes: string[];
}

export interface AssociateControlsDialogResult {
    selectedControlCodes: string[];
}

/**
 * Dialog for associating existing controls with a parent
 * Shows multi-select table of BASE controls to associate
 */
@Component({
    selector: 'app-associate-controls-dialog',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatDialogModule,
        MatFormFieldModule,
        MatInputModule,
        MatCheckboxModule,
        MatButtonModule,
        MatProgressSpinnerModule,
        MatTableModule,
    ],
    template: `
        <h2 mat-dialog-title>Associate Existing Controls</h2>
        <p class="dialog-subtitle">Parent: {{ data.parentLabel }} ({{ data.parentCode }})</p>

        <mat-dialog-content>
            <div class="filter-container">
                <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Filter controls</mat-label>
                    <input
                        matInput
                        [formControl]="filterControl"
                        placeholder="Search by code or label"
                    />
                </mat-form-field>
            </div>

            <div class="table-container">
                <table mat-table [dataSource]="filteredControls()" class="controls-table">
                    <!-- Checkbox Column -->
                    <ng-container matColumnDef="select">
                        <th mat-header-cell *matHeaderCellDef>
                            <mat-checkbox
                                (change)="$event ? toggleAll() : null"
                                [checked]="selection.hasValue() && isAllSelected()"
                                [indeterminate]="selection.hasValue() && !isAllSelected()"
                            >
                            </mat-checkbox>
                        </th>
                        <td mat-cell *matCellDef="let row">
                            <mat-checkbox
                                (click)="$event.stopPropagation()"
                                (change)="$event ? selection.toggle(row) : null"
                                [checked]="selection.isSelected(row)"
                            >
                            </mat-checkbox>
                        </td>
                    </ng-container>

                    <!-- Code Column -->
                    <ng-container matColumnDef="code">
                        <th mat-header-cell *matHeaderCellDef>Code</th>
                        <td mat-cell *matCellDef="let control">{{ control.code }}</td>
                    </ng-container>

                    <!-- Type Column -->
                    <ng-container matColumnDef="type">
                        <th mat-header-cell *matHeaderCellDef>Type</th>
                        <td mat-cell *matCellDef="let control">{{ control.type }}</td>
                    </ng-container>

                    <!-- Label Column -->
                    <ng-container matColumnDef="label">
                        <th mat-header-cell *matHeaderCellDef>Label</th>
                        <td mat-cell *matCellDef="let control">{{ control.label }}</td>
                    </ng-container>

                    <!-- Atomic Level Column -->
                    <ng-container matColumnDef="atomicLevel">
                        <th mat-header-cell *matHeaderCellDef>Level</th>
                        <td mat-cell *matCellDef="let control">{{ control.atomicLevelCode }}</td>
                    </ng-container>

                    <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                    <tr
                        mat-row
                        *matRowDef="let row; columns: displayedColumns"
                        (click)="selection.toggle(row)"
                        [class.selected-row]="selection.isSelected(row)"
                    ></tr>
                </table>

                <div *ngIf="filteredControls().length === 0" class="no-data">
                    No controls available to associate
                </div>
            </div>

            <div class="selection-info">{{ selection.selected.length }} control(s) selected</div>
        </mat-dialog-content>

        <mat-dialog-actions align="end">
            <button mat-button (click)="onCancel()">Cancel</button>
            <button
                mat-raised-button
                color="primary"
                (click)="onAssociate()"
                [disabled]="selection.selected.length === 0"
            >
                Associate {{ selection.selected.length }} Control(s)
            </button>
        </mat-dialog-actions>
    `,
    styles: [
        `
            .dialog-subtitle {
                margin: -8px 0 16px 0;
                color: #666;
                font-size: 14px;
            }

            .filter-container {
                margin-bottom: 16px;
            }

            .full-width {
                width: 100%;
            }

            .table-container {
                max-height: 400px;
                overflow: auto;
                border: 1px solid #e0e0e0;
                border-radius: 4px;
            }

            .controls-table {
                width: 100%;
            }

            .controls-table tr.selected-row {
                background-color: #e3f2fd;
            }

            .controls-table tr:hover {
                background-color: #f5f5f5;
                cursor: pointer;
            }

            .no-data {
                padding: 32px;
                text-align: center;
                color: #999;
            }

            .selection-info {
                margin-top: 16px;
                padding: 8px;
                background-color: #e8f5e9;
                border-radius: 4px;
                font-size: 14px;
                color: #2e7d32;
            }

            mat-dialog-content {
                min-width: 600px;
                max-width: 800px;
            }

            mat-dialog-actions {
                padding: 16px 0 0 0;
            }
        `,
    ],
})
export class AssociateControlsDialogComponent implements OnInit {
    private readonly fb = inject(FormBuilder);
    readonly dialogRef = inject(MatDialogRef<AssociateControlsDialogComponent>);
    readonly data = inject<AssociateControlsDialogData>(MAT_DIALOG_DATA);

    readonly filterControl = new FormControl('');
    readonly filteredControls = signal<Control[]>([]);
    readonly selection = new SelectionModel<Control>(true, []);

    readonly displayedColumns: string[] = ['select', 'code', 'type', 'label', 'atomicLevel'];

    ngOnInit(): void {
        // Filter out controls that are already associated
        const available = this.data.availableControls.filter(
            (control) => !this.data.existingChildCodes.includes(control.code)
        );
        this.filteredControls.set(available);

        // Setup filter listener
        this.filterControl.valueChanges.subscribe((filterValue) => {
            this.applyFilter(filterValue || '');
        });
    }

    private applyFilter(filterValue: string): void {
        const filtered = this.data.availableControls
            .filter((control) => !this.data.existingChildCodes.includes(control.code))
            .filter(
                (control) =>
                    control.code.toLowerCase().includes(filterValue.toLowerCase()) ||
                    control.label.toLowerCase().includes(filterValue.toLowerCase())
            );
        this.filteredControls.set(filtered);
    }

    isAllSelected(): boolean {
        const numSelected = this.selection.selected.length;
        const numRows = this.filteredControls().length;
        return numSelected === numRows && numRows > 0;
    }

    toggleAll(): void {
        if (this.isAllSelected()) {
            this.selection.clear();
        } else {
            this.filteredControls().forEach((row) => this.selection.select(row));
        }
    }

    onCancel(): void {
        this.dialogRef.close();
    }

    onAssociate(): void {
        const result: AssociateControlsDialogResult = {
            selectedControlCodes: this.selection.selected.map((c) => c.code),
        };
        this.dialogRef.close(result);
    }
}
