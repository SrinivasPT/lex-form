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
import {
    TableConfig,
    ActionDefinition,
    ControlDefinition,
} from '../../../../core/models/form-schema.interface';
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
                                *ngFor="let col of visibleColumns()"
                                (click)="sortBy(asControlDef(col).key)"
                                [class.sortable]="config.sortable"
                                [style.width]="getColumnWidth(asControlDef(col).key)"
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
                                *ngFor="let col of visibleColumns()"
                                [attr.data-label]="asControlDef(col).label"
                                [style.width]="getColumnWidth(asControlDef(col).key)"
                            >
                                <ng-container [ngSwitch]="normalizeType(asControlDef(col).type)">
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
                                    <app-input-control
                                        *ngSwitchCase="'date'"
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
    styleUrls: ['./table-control.component.scss'],
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

    // Computed: Visible columns (filter based on visibility settings)
    // Logic:
    // 1. If visibleColumns is present - show ONLY those columns
    // 2. If BOTH visibleColumns AND hiddenColumns - show visibleColumns minus hiddenColumns
    // 3. If only hiddenColumns - show all except hiddenColumns
    // 4. If neither - show all columns
    visibleColumns = computed(() => {
        const allControls = this.config.controls || [];
        const settings = this.config.additionalSettings;
        // additionalSettings is now parsed at schema resolution level
        const visibleCols = typeof settings === 'object' ? settings?.visibleColumns || [] : [];
        const hiddenCols = typeof settings === 'object' ? settings?.hiddenColumns || [] : [];

        // Case 1 & 2: visibleColumns is specified
        if (visibleCols.length > 0) {
            // Start with visible columns only
            let filtered = allControls.filter((col) =>
                visibleCols.includes(this.asControlDef(col).key)
            );

            // If hiddenColumns also specified, remove them from visible list
            if (hiddenCols.length > 0) {
                filtered = filtered.filter(
                    (col) => !hiddenCols.includes(this.asControlDef(col).key)
                );
            }

            return filtered;
        }

        // Case 3: Only hiddenColumns specified
        if (hiddenCols.length > 0) {
            return allControls.filter((col) => !hiddenCols.includes(this.asControlDef(col).key));
        }

        // Case 4: No visibility settings - show all
        return allControls;
    });

    // Computed: Column widths map
    private columnWidths = computed(() => this.calculateColumnWidths());

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
        return this.visibleColumns().length + (this.config.rowActions ? 1 : 0);
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
        console.log('addRow: newGroup created', newGroup, newGroup.controls);

        // 2. Add to Array
        this.getFormArray().push(newGroup);
        console.log('addRow: FormArray length after push', this.getFormArray().length);

        // 3. Trigger Signal Update
        this.arrayLength.update((n) => n + 1);
        console.log('addRow: arrayLength updated to', this.arrayLength());

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
        console.log('createNewRowGroup: config.controls', this.config.controls);
        const group = this.formGen.createRowGroup(this.config.controls as any[]);
        console.log(
            'createNewRowGroup: created group',
            group,
            'with controls:',
            Object.keys(group.controls)
        );
        return group;
    }

    asControlDef(col: any): any {
        return col;
    }

    /**
     * Get the calculated width for a column
     */
    getColumnWidth(columnKey: string): string | null {
        return this.columnWidths().get(columnKey) || null;
    }

    /**
     * Calculate proportional widths for all visible columns
     */
    private calculateColumnWidths(): Map<string, string> {
        const result = new Map<string, string>();
        const visibleCols = this.visibleColumns();
        // additionalSettings is now parsed at schema resolution level
        const additionalSettings =
            typeof this.config.additionalSettings === 'object'
                ? this.config.additionalSettings
                : null;

        if (!visibleCols.length) return result;

        // 1. Separate explicit vs auto columns
        const explicitCols = visibleCols.filter(
            (col) => additionalSettings?.columnWidths?.[this.asControlDef(col).key]
        );
        const autoCols = visibleCols.filter(
            (col) => !additionalSettings?.columnWidths?.[this.asControlDef(col).key]
        );

        // 2. Calculate total explicit width (parse percentages)
        let explicitTotal = 0;
        explicitCols.forEach((col) => {
            const key = this.asControlDef(col).key;
            const widthStr = additionalSettings?.columnWidths?.[key] || '0%';
            result.set(key, widthStr);
            explicitTotal += this.parsePercent(widthStr);
        });

        // 3. Calculate remaining percentage for auto columns
        const remainingPercent = 100 - explicitTotal;

        if (autoCols.length === 0 || remainingPercent <= 0) {
            return result;
        }

        // 4. Get width units for auto columns (from control.width)
        const autoWidthUnits = autoCols.map((col) =>
            this.getDesktopWidth(this.asControlDef(col).width)
        );
        const totalUnits = autoWidthUnits.reduce((sum, w) => sum + w, 0);

        // 5. Calculate proportional widths
        if (totalUnits > 0) {
            autoCols.forEach((col, idx) => {
                const proportion = autoWidthUnits[idx] / totalUnits;
                const widthPercent = proportion * remainingPercent;
                result.set(this.asControlDef(col).key, `${widthPercent.toFixed(2)}%`);
            });
        } else {
            // Fallback: equal distribution if no width information
            const equalPercent = remainingPercent / autoCols.length;
            autoCols.forEach((col) => {
                result.set(this.asControlDef(col).key, `${equalPercent.toFixed(2)}%`);
            });
        }

        return result;
    }

    /**
     * Extract desktop width from control.width field
     * Supports: number, array, or JSON string
     */
    private getDesktopWidth(width: number | number[] | string | undefined): number {
        if (!width) return 1; // Default weight

        // If it's a number, use it directly
        if (typeof width === 'number') return width;

        // If it's an array, use the last element (desktop breakpoint)
        if (Array.isArray(width)) {
            return width[width.length - 1] || 1;
        }

        // If it's a string, try to parse as JSON array
        if (typeof width === 'string') {
            try {
                const parsed = JSON.parse(width);
                if (Array.isArray(parsed)) {
                    return parsed[parsed.length - 1] || 1;
                }
                if (typeof parsed === 'number') {
                    return parsed;
                }
            } catch {
                // Not valid JSON, treat as single number
                const num = parseInt(width, 10);
                return isNaN(num) ? 1 : num;
            }
        }

        return 1; // Fallback
    }

    /**
     * Parse percentage string to number (e.g., "25%" -> 25)
     */
    private parsePercent(widthStr: string): number {
        if (!widthStr) return 0;
        const match = widthStr.match(/([\d.]+)%/);
        return match ? parseFloat(match[1]) : 0;
    }

    normalizeType(type: string): string {
        return type?.toLowerCase() || 'text';
    }
}
