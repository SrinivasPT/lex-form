import {
    Component,
    Input,
    OnInit,
    Output,
    EventEmitter,
    inject,
    computed,
    signal,
    effect,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    ReactiveFormsModule,
    FormGroup,
    FormArray,
    AbstractControl,
    FormBuilder,
} from '@angular/forms';

// Components
import { InputControlComponent } from '../input-control.component';
import { SelectControlComponent } from '../select-control.component';
import { TableToolbarComponent } from './table-toolbar.component';
import { TablePaginationComponent } from './table-pagination.component';

// Interfaces & Services
import { TableConfig, ActionDefinition } from '../../../../core/models/form-schema.interface';
import { FormGeneratorService } from '../../../../core/services/form-generator.service';
import { ExpressionEvaluatorService } from '../../../../core/services/expression-evaluator.service';

// Payload for Event Bubbling
export interface FormActionEvent {
    actionId: string;
    formKey: string;
    rowIndex?: number;
    rowResult?: any;
}

@Component({
    selector: 'app-table-control',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        InputControlComponent,
        SelectControlComponent,
        TableToolbarComponent,
        TablePaginationComponent,
    ],
    template: `
        <div class="table-wrapper">
            <app-table-toolbar
                [searchable]="config.searchable || false"
                [actions]="config.headerActions || []"
                (search)="searchTerm.set($event)"
                (actionClick)="onHeaderAction($event)"
            >
                <button class="btn-primary" (click)="addRow()">
                    + {{ config.addLabel || 'Add Row' }}
                </button>
            </app-table-toolbar>

            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th
                                *ngFor="let col of config.controls"
                                (click)="sortBy(asControlDef(col).key)"
                                [class.sortable]="config.sortable"
                            >
                                {{ asControlDef(col).label }}
                                <span
                                    *ngIf="sortColumn() === asControlDef(col).key"
                                    class="sort-icon"
                                >
                                    {{ sortDirection() === 'asc' ? '▲' : '▼' }}
                                </span>
                            </th>

                            <th *ngIf="config.rowActions?.length" class="action-head">Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        <tr *ngFor="let rowWrapper of viewRows(); trackBy: trackByFn">
                            <td
                                *ngFor="let col of config.controls"
                                [attr.data-label]="asControlDef(col).label"
                            >
                                <ng-container [ngSwitch]="asControlDef(col).type">
                                    <app-input-control
                                        *ngSwitchCase="'text'"
                                        [config]="asControlDef(col)"
                                        [group]="asGroup(rowWrapper.control)"
                                    ></app-input-control>
                                    <app-input-control
                                        *ngSwitchCase="'number'"
                                        [config]="asControlDef(col)"
                                        [group]="asGroup(rowWrapper.control)"
                                    ></app-input-control>
                                    <app-select-control
                                        *ngSwitchCase="'select'"
                                        [config]="asControlDef(col)"
                                        [group]="asGroup(rowWrapper.control)"
                                    ></app-select-control>
                                    <div *ngSwitchDefault>
                                        {{
                                            asGroup(rowWrapper.control).get(asControlDef(col).key)
                                                ?.value
                                        }}
                                    </div>
                                </ng-container>
                            </td>

                            <td
                                *ngIf="config.rowActions?.length"
                                class="action-cell"
                                data-label="Actions"
                            >
                                <ng-container *ngFor="let action of config.rowActions">
                                    <button
                                        *ngIf="isActionVisible(action, rowWrapper.control.value)"
                                        (click)="onRowAction(action, rowWrapper.originalIndex)"
                                        class="action-btn"
                                        [class]="action.cssClass"
                                        [attr.aria-label]="action.ariaLabel || action.label"
                                        [title]="action.label"
                                    >
                                        <i *ngIf="action.icon" [class]="action.icon"></i>
                                        <span>{{ action.label }}</span>
                                    </button>
                                </ng-container>
                            </td>
                        </tr>

                        <tr *ngIf="viewRows().length === 0">
                            <td [attr.colspan]="totalCols" class="empty-row">
                                {{ searchTerm() ? 'No results found.' : 'No items added yet.' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <app-table-pagination
                *ngIf="config.pagination?.enabled"
                [totalItems]="filteredCount()"
                [pageSize]="pageSize()"
                [currentPage]="currentPage()"
                (pageChange)="currentPage.set($event)"
            >
            </app-table-pagination>
        </div>
    `,
    styles: [
        `
            /* TABLE STYLES */
            .table-wrapper {
                border: 1px solid #ddd;
                border-radius: 6px;
                padding: 10px;
                background: #fff;
            }
            .data-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 5px;
            }
            .data-table th,
            .data-table td {
                padding: 4px;
                border-bottom: 1px solid #eee;
                text-align: left;
                vertical-align: middle;
            }
            .data-table th {
                background: #f9f9f9;
                font-weight: 600;
                color: #555;
                padding: 10px; /* Keep header padding */
            }

            /* CSS Strategy: Hide labels inside table cells */
            .data-table td ::ng-deep label {
                display: none !important;
            }

            /* Remove margin from form fields inside table */
            .data-table td ::ng-deep .form-field {
                margin-bottom: 0 !important;
            }

            /* Sorting */
            .sortable {
                cursor: pointer;
                user-select: none;
            }
            .sortable:hover {
                background: #f0f0f0;
            }
            .sort-icon {
                font-size: 0.8em;
                margin-left: 5px;
            }

            /* Actions */
            .action-btn {
                background: none;
                border: none;
                cursor: pointer;
                margin-right: 5px;
                padding: 4px;
                color: #666;
            }
            .action-btn:hover {
                color: #000;
                background: #f0f0f0;
                border-radius: 4px;
            }
            .btn-primary {
                background: #007bff;
                color: white;
                border: none;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
            }
            .empty-row {
                text-align: center;
                padding: 20px;
                color: #999;
                font-style: italic;
            }

            /* --- RESPONSIVE CSS-ONLY STRATEGY --- */
            @media (max-width: 768px) {
                .data-table,
                .data-table thead,
                .data-table tbody,
                .data-table th,
                .data-table td,
                .data-table tr {
                    display: block;
                }
                .data-table thead tr {
                    position: absolute;
                    top: -9999px;
                    left: -9999px;
                }
                .data-table tr {
                    border: 1px solid #ccc;
                    margin-bottom: 10px;
                    border-radius: 6px;
                    padding: 8px;
                    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
                }
                .data-table td {
                    border: none;
                    position: relative;
                    padding-left: 50%;
                    min-height: 24px;
                    margin-bottom: 4px;
                }
                .data-table td:before {
                    position: absolute;
                    left: 10px;
                    width: 45%;
                    padding-right: 10px;
                    white-space: nowrap;
                    font-weight: bold;
                    content: attr(data-label);
                    color: #444;
                }
                .action-cell {
                    padding-left: 10px !important;
                    text-align: right;
                    border-top: 1px solid #eee;
                    margin-top: 8px;
                    padding-top: 8px;
                }
                .action-cell:before {
                    display: none;
                }
            }
        `,
    ],
})
export class TableControlComponent implements OnInit {
    @Input({ required: true }) config!: TableConfig;
    @Input({ required: true }) parentGroup!: FormGroup;

    @Output() actionTriggered = new EventEmitter<FormActionEvent>();

    // Services
    private formGen = inject(FormGeneratorService);
    private evaluator = inject(ExpressionEvaluatorService);

    // Signals for State
    searchTerm = signal('');
    currentPage = signal(1);
    sortColumn = signal<string | null>(null);
    sortDirection = signal<'asc' | 'desc'>('asc');

    // Track raw array length for reactivity (since FormArray itself is not a signal)
    arrayLength = signal(0);

    ngOnInit() {
        console.log('TableControl initialized', this.config);
        // Sync array length initially
        this.arrayLength.set(this.getFormArray().length);
    }

    // --- GETTERS ---
    getFormArray(): FormArray {
        const arr = this.parentGroup.get(this.config.key) as FormArray;
        if (!arr) throw new Error(`TableControl: No FormArray found for key '${this.config.key}'`);
        return arr;
    }

    get totalCols() {
        return (this.config.controls?.length || 0) + (this.config.rowActions ? 1 : 0);
    }

    pageSize = computed(() => this.config.pagination?.pageSize || 10);

    // --- DATA PIPELINE (The Magic) ---

    // 1. Raw Source: Maps controls to wrappers { control, originalIndex }
    // We depend on 'arrayLength' signal so this re-computes when rows are added/removed
    private rawRows = computed(() => {
        // Depend on the signal
        const _ = this.arrayLength();
        const controls = this.getFormArray().controls;
        console.log('rawRows', controls.length);
        return controls.map((control, index) => ({
            control: control as FormGroup,
            originalIndex: index,
        }));
    });

    // 2. Filtered
    private filteredRows = computed(() => {
        const rows = this.rawRows();
        const term = this.searchTerm().toLowerCase();

        if (!term || !this.config.searchable) return rows;

        return rows.filter((wrapper) => {
            const data = wrapper.control.value;
            // Simple search: check all string/number values in the row
            return Object.values(data).some(
                (val) => val && String(val).toLowerCase().includes(term)
            );
        });
    });

    // 3. Sorted
    private sortedRows = computed(() => {
        const rows = [...this.filteredRows()]; // Clone to sort
        const colKey = this.sortColumn();
        const dir = this.sortDirection();

        if (!colKey || !this.config.sortable) return rows;

        return rows.sort((a, b) => {
            const valA = a.control.get(colKey)?.value;
            const valB = b.control.get(colKey)?.value;

            if (valA === valB) return 0;
            if (valA === null || valA === undefined) return 1;
            if (valB === null || valB === undefined) return -1;

            const compare = valA < valB ? -1 : 1;
            return dir === 'asc' ? compare : -compare;
        });
    });

    // 4. Paginated (Final View)
    viewRows = computed(() => {
        const rows = this.sortedRows();
        console.log('viewRows computed', rows.length);

        if (!this.config.pagination?.enabled) return rows;

        const size = this.pageSize();
        const start = (this.currentPage() - 1) * size;
        return rows.slice(start, start + size);
    });

    filteredCount = computed(() => this.filteredRows().length);

    // --- ACTIONS ---

    // Add New Row
    addRow() {
        // 1. Create Data (Empty or Defaults)
        // NOTE: In a real app, you might want default values from schema
        const newGroup = this.createNewRowGroup();

        // 2. Add to Array
        this.getFormArray().push(newGroup);

        // 3. Trigger Signal Update
        this.arrayLength.update((n) => n + 1);

        // 4. Jump to last page if paginated
        if (this.config.pagination?.enabled) {
            const total = this.getFormArray().length;
            const lastPage = Math.ceil(total / this.pageSize());
            this.currentPage.set(lastPage);
        }
    }

    // Row Action Click
    onRowAction(action: ActionDefinition, originalIndex: number) {
        // 1. Bubbling Event
        this.actionTriggered.emit({
            actionId: action.id,
            formKey: this.config.key,
            rowIndex: originalIndex,
            rowResult: this.getFormArray().at(originalIndex).value,
        });

        // 2. Internal Handling (Default Behaviors)
        if (action.id === 'delete') {
            this.getFormArray().removeAt(originalIndex);
            this.arrayLength.update((n) => n - 1);

            // Fix pagination if we deleted the last item on current page
            const maxPage = Math.ceil(this.filteredCount() / this.pageSize());
            if (this.currentPage() > maxPage && maxPage > 0) {
                this.currentPage.set(maxPage);
            }
        }
    }

    // Header Action Click
    onHeaderAction(action: ActionDefinition) {
        this.actionTriggered.emit({
            actionId: action.id,
            formKey: this.config.key,
        });
    }

    // --- HELPERS ---

    sortBy(key: string) {
        if (!this.config.sortable) return;
        if (this.sortColumn() === key) {
            this.sortDirection.update((d) => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            this.sortColumn.set(key);
            this.sortDirection.set('asc');
        }
    }

    isActionVisible(action: ActionDefinition, rowData: any): boolean {
        if (!action.visibleWhen) return true;
        return this.evaluator.evaluate(action.visibleWhen, { row: rowData });
    }

    asGroup(c: AbstractControl): FormGroup {
        return c as FormGroup;
    }

    trackByFn(index: number, item: any) {
        return item.originalIndex;
    }

    // Internal helper to create a new row form group based on columns
    private createNewRowGroup(): FormGroup {
        return this.formGen.createRowGroup(this.config.controls as any[]);
    }

    asControlDef(col: any): any {
        return col;
    }
}
