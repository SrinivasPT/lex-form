import { Component, inject, OnInit, signal, DestroyRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatMenuModule, MatMenuTrigger } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import {
    TreeControlComponent,
    ControlDefinition,
    DynamicFormComponent,
    FormSchema,
    FormAction,
} from 'form-lib';
import { FormDataService, TreeOption } from '../core/services/form-data.service';
import { ToastService } from '../core/services/toast.service';
import {
    CreateControlDialogComponent,
    CreateControlDialogData,
    CreateControlDialogResult,
} from './create-control-dialog.component';
import {
    AssociateControlsDialogComponent,
    AssociateControlsDialogData,
    AssociateControlsDialogResult,
} from './associate-controls-dialog.component';
import { tap, catchError, of, switchMap, filter, distinctUntilChanged, forkJoin } from 'rxjs';

@Component({
    selector: 'app-form-admin-control',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        TreeControlComponent,
        DynamicFormComponent,
        MatDialogModule,
        MatMenuModule,
        MatButtonModule,
        MatIconModule,
        MatDividerModule,
    ],
    templateUrl: './form-admin-control.component.html',
    styleUrls: ['./form-admin-control.component.scss'],
})
export class FormAdminControlComponent implements OnInit {
    private readonly formDataService = inject(FormDataService);
    private readonly toastService = inject(ToastService);
    private readonly fb = inject(FormBuilder);
    private readonly dialog = inject(MatDialog);
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private loadingTimeout?: number;

    @ViewChild(MatMenuTrigger) contextMenu!: MatMenuTrigger;

    protected formGroup!: FormGroup;
    protected readonly form = signal<FormGroup | null>(null);
    protected readonly isInitialLoading = signal(true);
    protected readonly isFormDataLoading = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly schema = signal<FormSchema | null>(null);
    protected readonly initialValues = signal<Record<string, any>>({});
    protected readonly selectedNodeCode = signal<string | null>(null);
    protected readonly selectedNodeData = signal<any>(null);
    protected readonly formCode = signal<string>('');
    protected readonly treeConfig = signal<ControlDefinition>({
        key: 'treeField',
        type: 'tree',
        label: 'Select from Tree',
        options: [],
    });
    protected readonly contextMenuPosition = signal<{ x: string; y: string }>({
        x: '0px',
        y: '0px',
    });
    protected readonly allControls = signal<any[]>([]);

    ngOnInit(): void {
        // Get form code from route parameter
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
            const code = params.get('formCode') || 'control_form';
            this.formCode.set(code);
            this.loadInitialFormData();
        });
    }

    /**
     * Load all initial form data in parallel using forkJoin
     */
    private loadInitialFormData(): void {
        this.isInitialLoading.set(true);
        this.error.set(null);

        const formCodeValue = this.formCode();
        const hierarchyCode = `${formCodeValue}`; // e.g., employee_form

        forkJoin({
            schema: this.formDataService.getFormSchema('control_form'),
            treeHierarchy: this.formDataService.getTreeHierarchy(hierarchyCode),
            allControls: this.formDataService.getAllControls(),
        })
            .pipe(
                switchMap((data) => {
                    this.treeConfig.set({
                        key: 'treeField',
                        type: 'tree',
                        label: 'Select from Tree',
                        options: data.treeHierarchy as any,
                    });

                    // Set initial tree root from formCode
                    const rootCode = data.treeHierarchy[0]?.code || formCodeValue;
                    this.formGroup = this.fb.group({ treeField: [rootCode] });
                    this.setupTreeSelectionListener();

                    this.schema.set(data.schema);
                    this.allControls.set(data.allControls);
                    this.selectedNodeCode.set(rootCode);

                    // Load form data for initial root node
                    return this.formDataService.getFormData(rootCode).pipe(
                        tap((formData) => {
                            this.initialValues.set(formData);
                            this.selectedNodeData.set(formData);
                            this.isInitialLoading.set(false);
                        }),
                    );
                }),
                catchError((err) => {
                    console.error('Failed to load form configuration', err);
                    this.error.set('Failed to load form. Please refresh the page.');
                    this.toastService.error('Failed to load form configuration');
                    this.isInitialLoading.set(false);
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    /**
     * Setup reactive listener for tree selection changes
     * Uses switchMap to cancel previous requests when selection changes quickly
     * Delays loading indicator to prevent flickering on fast loads
     */
    private setupTreeSelectionListener(): void {
        this.formGroup
            .get('treeField')
            ?.valueChanges.pipe(
                filter((value) => value != null),
                distinctUntilChanged(),
                tap((selectedCode) => {
                    this.selectedNodeCode.set(selectedCode);
                    this.error.set(null);
                    this.loadingTimeout = window.setTimeout(
                        () => this.isFormDataLoading.set(true),
                        300,
                    );
                }),
                switchMap((selectedCode) =>
                    this.formDataService.getFormData(selectedCode).pipe(
                        catchError((err) => {
                            console.error('Failed to load form data', err);
                            this.error.set('Failed to load form data.');
                            this.toastService.error('Failed to load form data');
                            return of({});
                        }),
                    ),
                ),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe((data) => {
                if (this.loadingTimeout) {
                    clearTimeout(this.loadingTimeout);
                    this.loadingTimeout = undefined;
                }
                this.initialValues.set(data);
                this.selectedNodeData.set(data);
                this.isFormDataLoading.set(false);
                this.form()?.patchValue(data);
            });
    }

    /**
     * Handle context menu on tree node right-click
     */
    protected onTreeContextMenu(event: MouseEvent, nodeCode: string): void {
        event.preventDefault();
        const nodeData = this.findNodeByCode(nodeCode);
        if (!nodeData) return;

        // Don't show context menu for BASE controls
        if (nodeData.atomicLevelCode === 'BASE') {
            return;
        }

        this.selectedNodeCode.set(nodeCode);
        this.selectedNodeData.set(nodeData);
        this.contextMenuPosition.set({
            x: event.clientX + 'px',
            y: event.clientY + 'px',
        });

        this.contextMenu?.openMenu();
    }

    /**
     * Find tree node by code
     */
    private findNodeByCode(code: string): any {
        return this.allControls().find((c) => c.code === code);
    }

    /**
     * Check if current node can show context menu
     */
    protected canShowContextMenu(): boolean {
        const nodeData = this.selectedNodeData();
        return nodeData && nodeData.atomicLevelCode !== 'BASE';
    }

    /**
     * Open create control dialog
     */
    protected onCreateControl(): void {
        const parentCode = this.selectedNodeCode();
        if (!parentCode) return;

        const dialogData: CreateControlDialogData = {
            parentCode,
            atomicLevelOptions: [
                { code: 'SECTION', displayText: 'Section' },
                { code: 'TAB', displayText: 'Tab' },
                { code: 'GROUP', displayText: 'Group' },
            ],
            typeOptions: [
                { code: 'section', displayText: 'Section' },
                { code: 'tab', displayText: 'Tab' },
                { code: 'group', displayText: 'Group' },
            ],
        };

        const dialogRef = this.dialog.open(CreateControlDialogComponent, {
            width: '500px',
            data: dialogData,
        });

        dialogRef.afterClosed().subscribe((result: CreateControlDialogResult) => {
            if (result) {
                this.createControl(result, parentCode);
            }
        });
    }

    /**
     * Create new control and auto-associate with parent
     */
    private createControl(controlData: CreateControlDialogResult, parentCode: string): void {
        this.isFormDataLoading.set(true);

        this.formDataService
            .createControl(controlData)
            .pipe(
                switchMap((createdControl) => {
                    // Auto-associate with parent
                    return this.formDataService.createControlAssociations(parentCode, [
                        createdControl.code,
                    ]);
                }),
                tap(() => {
                    this.toastService.success('Control created and associated successfully');
                    this.refreshTreeAndSelectNode(controlData.code);
                }),
                catchError((err) => {
                    console.error('Failed to create control:', err);
                    this.toastService.error('Failed to create control: ' + err.message);
                    this.isFormDataLoading.set(false);
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    /**
     * Open associate controls dialog
     */
    protected onAssociateControls(): void {
        const parentCode = this.selectedNodeCode();
        const parentData = this.selectedNodeData();
        if (!parentCode || !parentData) return;

        // Get existing child codes
        const existingChildCodes = parentData.children?.map((c: any) => c.code) || [];

        const dialogData: AssociateControlsDialogData = {
            parentCode,
            parentLabel: parentData.label || parentCode,
            availableControls: this.allControls(),
            existingChildCodes,
        };

        const dialogRef = this.dialog.open(AssociateControlsDialogComponent, {
            width: '800px',
            data: dialogData,
        });

        dialogRef.afterClosed().subscribe((result: AssociateControlsDialogResult) => {
            if (result && result.selectedControlCodes.length > 0) {
                this.associateControls(parentCode, result.selectedControlCodes);
            }
        });
    }

    /**
     * Associate existing controls with parent
     */
    private associateControls(parentCode: string, childCodes: string[]): void {
        this.isFormDataLoading.set(true);

        this.formDataService
            .createControlAssociations(parentCode, childCodes)
            .pipe(
                tap((response) => {
                    const created = response.created || childCodes.length;
                    this.toastService.success(`${created} control(s) associated successfully`);
                    this.refreshTreeAndSelectNode(parentCode);
                }),
                catchError((err) => {
                    console.error('Failed to associate controls:', err);
                    this.toastService.error('Failed to associate controls: ' + err.message);
                    this.isFormDataLoading.set(false);
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    /**
     * Delete control or association
     */
    protected onDelete(): void {
        const nodeCode = this.selectedNodeCode();
        const nodeData = this.selectedNodeData();
        if (!nodeCode || !nodeData) return;

        const confirmMessage =
            nodeData.atomicLevelCode === 'BASE'
                ? `Remove association for "${nodeData.label}"?`
                : `Delete control "${nodeData.label}"? This action cannot be undone.`;

        if (!confirm(confirmMessage)) return;

        this.isFormDataLoading.set(true);

        this.formDataService
            .deleteControl(nodeCode)
            .pipe(
                tap((response) => {
                    const action = response.deletedControl ? 'deleted' : 'association removed';
                    this.toastService.success(`Control ${action} successfully`);
                    this.refreshTreeAndSelectNode(nodeData.parentCode || this.formCode());
                }),
                catchError((err) => {
                    console.error('Failed to delete control:', err);
                    const errorMsg = err.error?.reason || err.message || 'Unknown error';
                    this.toastService.error('Failed to delete: ' + errorMsg);
                    this.isFormDataLoading.set(false);
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    /**
     * Refresh tree and select specific node
     */
    private refreshTreeAndSelectNode(nodeCode: string): void {
        const hierarchyCode = `${this.formCode()}_root`;

        forkJoin({
            treeHierarchy: this.formDataService.getTreeHierarchy(hierarchyCode),
            allControls: this.formDataService.getAllControls(),
        })
            .pipe(
                tap((data) => {
                    this.treeConfig.set({
                        key: 'treeField',
                        type: 'tree',
                        label: 'Select from Tree',
                        options: data.treeHierarchy as any,
                    });
                    this.allControls.set(data.allControls);
                    this.formGroup.patchValue({ treeField: nodeCode });
                    this.isFormDataLoading.set(false);
                }),
                catchError((err) => {
                    console.error('Failed to refresh tree:', err);
                    this.toastService.error('Failed to refresh tree');
                    this.isFormDataLoading.set(false);
                    return of(null);
                }),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe();
    }

    protected onFormReady(form: FormGroup): void {
        this.form.set(form);
    }

    /**
     * Check if form is dirty (has unsaved changes)
     */
    protected isFormDirty(): boolean {
        return this.form()?.dirty ?? false;
    }

    /**
     * Save handler for header button
     */
    protected onHeaderSave(): void {
        const currentForm = this.form();
        if (!currentForm) return;
        this.onSave(currentForm);
    }

    /**
     * Save form data
     */
    private onSave(form: FormGroup): void {
        const selectedCode = this.selectedNodeCode();
        if (!selectedCode || form.invalid) return;

        this.error.set(null);
        this.isFormDataLoading.set(true);

        this.formDataService
            .updateControl(selectedCode, form.value)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.toastService.success('Control updated successfully');
                    form.markAsPristine();
                    this.isFormDataLoading.set(false);
                },
                error: (err) => {
                    console.error('Failed to save form', err);
                    const errorMsg =
                        err.error?.error || err.error?.reason || err.message || 'Unknown error';
                    this.error.set(`Failed to save: ${errorMsg}`);
                    this.toastService.error(`Failed to save: ${errorMsg}`);
                    this.isFormDataLoading.set(false);
                },
            });
    }

    protected onReset(form: FormGroup): void {
        form.reset();
        const initValues = this.initialValues();
        if (initValues && Object.keys(initValues).length > 0) {
            form.patchValue(initValues);
        }
    }
}
