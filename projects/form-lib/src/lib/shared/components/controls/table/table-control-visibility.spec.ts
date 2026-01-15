import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormArray, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TableControlComponent } from './table-control.component';
import { FormGeneratorService } from '../../../../core/services/form-generator.service';
import { ExpressionEvaluatorService } from '../../../../core/services/expression-evaluator.service';
import { TableConfig } from '../../../../core/models/form-schema.interface';

describe('TableControlComponent - Column Visibility & Width', () => {
    let component: TableControlComponent;
    let fixture: ComponentFixture<TableControlComponent>;
    let mockFormGen: jasmine.SpyObj<FormGeneratorService>;
    let mockEvaluator: jasmine.SpyObj<ExpressionEvaluatorService>;

    beforeEach(async () => {
        mockFormGen = jasmine.createSpyObj('FormGeneratorService', ['createRowGroup']);
        mockEvaluator = jasmine.createSpyObj('ExpressionEvaluatorService', ['evaluate']);

        await TestBed.configureTestingModule({
            imports: [TableControlComponent, ReactiveFormsModule],
            providers: [
                { provide: FormGeneratorService, useValue: mockFormGen },
                { provide: ExpressionEvaluatorService, useValue: mockEvaluator },
            ],
        }).compileComponents();

        fixture = TestBed.createComponent(TableControlComponent);
        component = fixture.componentInstance;
    });

    describe('visibleColumns', () => {
        it('should return all columns when no visibility settings', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'col1', label: 'Column 1' },
                    { key: 'col2', label: 'Column 2' },
                    { key: 'col3', label: 'Column 3' },
                ],
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            const visible = component.visibleColumns();
            expect(visible.length).toBe(3);
        });

        it('should show only visibleColumns when specified', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                ],
                additionalSettings: {
                    visibleColumns: ['name', 'email'],
                },
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            const visible = component.visibleColumns();
            expect(visible.length).toBe(2);
            expect(visible.map((c: any) => c.key)).toEqual(['name', 'email']);
        });

        it('should filter out hidden columns', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'id', label: 'ID', width: [12, 6, 2] },
                    { key: 'name', label: 'Name', width: [12, 6, 4] },
                    { key: 'email', label: 'Email', width: [12, 6, 3] },
                    { key: 'internal', label: 'Internal', width: [12, 6, 3] },
                ],
                additionalSettings: {
                    hiddenColumns: ['id', 'internal'],
                },
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            const visible = component.visibleColumns();
            expect(visible.length).toBe(2);
            expect(visible.map((c: any) => c.key)).toEqual(['name', 'email']);
        });

        it('should handle both visibleColumns and hiddenColumns (hidden takes precedence)', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                    { key: 'phone', label: 'Phone' },
                    { key: 'notes', label: 'Notes' },
                ],
                additionalSettings: {
                    visibleColumns: ['name', 'email', 'phone', 'notes'],
                    hiddenColumns: ['notes'],
                },
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            const visible = component.visibleColumns();
            expect(visible.length).toBe(3);
            expect(visible.map((c: any) => c.key)).toEqual(['name', 'email', 'phone']);
        });
    });

    describe('calculateColumnWidths', () => {
        it('should use explicit widths when provided', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'name', label: 'Name', width: [12, 6, 4] },
                    { key: 'email', label: 'Email', width: [12, 6, 3] },
                ],
                additionalSettings: {
                    columnWidths: {
                        name: '60%',
                    },
                },
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            const width = component.getColumnWidth('name');
            expect(width).toBe('60%');
        });

        it('should calculate proportional widths for auto columns', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'name', label: 'Name', width: [12, 6, 4] },
                    { key: 'email', label: 'Email', width: [12, 6, 4] },
                    { key: 'status', label: 'Status', width: [12, 6, 2] },
                ],
                additionalSettings: {
                    columnWidths: {
                        name: '40%',
                    },
                },
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            // name: 40% explicit
            // remaining: 60%
            // email: 4 units, status: 2 units, total: 6 units
            // email: (4/6) * 60% = 40%
            // status: (2/6) * 60% = 20%

            expect(component.getColumnWidth('name')).toBe('40%');
            expect(component.getColumnWidth('email')).toBe('40.00%');
            expect(component.getColumnWidth('status')).toBe('20.00%');
        });

        it('should handle hidden columns in width calculation', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'id', label: 'ID', width: [12, 6, 2] },
                    { key: 'name', label: 'Name', width: [12, 6, 4] },
                    { key: 'email', label: 'Email', width: [12, 6, 4] },
                ],
                additionalSettings: {
                    hiddenColumns: ['id'],
                },
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            // id is hidden, should not get width
            // name: 4 units, email: 4 units, total: 8 units
            // each gets 50%

            expect(component.getColumnWidth('id')).toBeNull();
            expect(component.getColumnWidth('name')).toBe('50.00%');
            expect(component.getColumnWidth('email')).toBe('50.00%');
        });

        it('should handle visibleColumns in width calculation', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'id', label: 'ID', width: [12, 6, 2] },
                    { key: 'name', label: 'Name', width: [12, 6, 4] },
                    { key: 'email', label: 'Email', width: [12, 6, 4] },
                    { key: 'phone', label: 'Phone', width: [12, 6, 2] },
                ],
                additionalSettings: {
                    visibleColumns: ['name', 'email'],
                },
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            // Only name and email visible
            // name: 4 units, email: 4 units, total: 8 units
            // each gets 50%

            expect(component.getColumnWidth('id')).toBeNull();
            expect(component.getColumnWidth('name')).toBe('50.00%');
            expect(component.getColumnWidth('email')).toBe('50.00%');
            expect(component.getColumnWidth('phone')).toBeNull();
        });

        it('should parse width as JSON string', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'col1', label: 'Col1', width: '[12, 6, 3]' }, // String format
                    { key: 'col2', label: 'Col2', width: '[12, 6, 3]' },
                ],
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            // Both should get 50% (equal width units)
            expect(component.getColumnWidth('col1')).toBe('50.00%');
            expect(component.getColumnWidth('col2')).toBe('50.00%');
        });
    });

    describe('totalCols', () => {
        it('should count visible columns only', () => {
            component.config = {
                key: 'test_table',
                type: 'table',
                controls: [
                    { key: 'id', label: 'ID' },
                    { key: 'name', label: 'Name' },
                    { key: 'email', label: 'Email' },
                ],
                additionalSettings: {
                    hiddenColumns: ['id'],
                },
                rowActions: [{ id: 'delete', label: 'Delete' }],
            } as TableConfig;

            component.parentGroup = new FormGroup({
                test_table: new FormArray([]),
            });

            fixture.detectChanges();

            // 2 visible columns + 1 action column
            expect(component.totalCols).toBe(3);
        });
    });
});
