import { Component, Input, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatTreeNestedDataSource, MatTreeModule } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

import { ControlDefinition } from '../../../core/models/form-schema.interface';
import { DomainData, DomainValue } from '../../../core/services/domain-data.service';

/**
 * Tree node structure expected from domain data
 * Supports parent-child relationships via parentCode
 */
interface TreeNode {
    code: string;
    displayText: string;
    parentCode?: string | null;
    hasChildren?: boolean;
    children?: TreeNode[];
}

@Component({
    selector: 'app-tree-control',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatTreeModule, MatIconModule, MatButtonModule],
    template: `
        <div [formGroup]="group" class="form-field tree-control">
            <label [attr.for]="config.key">
                {{ config.label }}
                <span class="required" *ngIf="isRequired">*</span>
            </label>

            <ng-container *ngIf="loading(); else notLoading">
                <div class="loading-indicator">Loading tree data...</div>
            </ng-container>

            <ng-template #notLoading>
                <div *ngIf="dataSource.data.length === 0" class="empty-message">
                    No data available
                </div>
                <div *ngIf="dataSource.data.length > 0" class="tree-container">
                    <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
                        <!-- Tree node template for expandable nodes -->
                        <mat-nested-tree-node
                            *matTreeNodeDef="let node; when: hasChild"
                            [attr.aria-expanded]="treeControl.isExpanded(node)"
                        >
                            <div class="tree-node-content">
                                <button
                                    mat-icon-button
                                    matTreeNodeToggle
                                    [attr.aria-label]="'Toggle ' + node.displayText"
                                    [class.expanded]="treeControl.isExpanded(node)"
                                >
                                    <mat-icon class="mat-icon-rtl-mirror">{{
                                        treeControl.isExpanded(node)
                                            ? 'expand_more'
                                            : 'chevron_right'
                                    }}</mat-icon>
                                </button>
                                <span
                                    class="tree-node-label expandable"
                                    (click)="selectNode(node)"
                                    [class.selected]="isSelected(node)"
                                    [attr.role]="'button'"
                                    [attr.tabindex]="0"
                                    (keydown.enter)="selectNode(node)"
                                    (keydown.space)="selectNode(node)"
                                >
                                    {{ node.displayText }}
                                </span>
                            </div>
                            <div
                                class="nested-children"
                                [style.display]="treeControl.isExpanded(node) ? 'block' : 'none'"
                            >
                                <ng-container matTreeNodeOutlet></ng-container>
                            </div>
                        </mat-nested-tree-node>

                        <!-- Tree node template for leaf nodes -->
                        <mat-tree-node *matTreeNodeDef="let node">
                            <div class="tree-node-content">
                                <button mat-icon-button disabled></button>
                                <span
                                    class="tree-node-label leaf"
                                    (click)="selectNode(node)"
                                    [class.selected]="isSelected(node)"
                                    role="button"
                                    tabindex="0"
                                    (keydown.enter)="selectNode(node)"
                                    (keydown.space)="selectNode(node)"
                                >
                                    {{ node.displayText }}
                                </span>
                            </div>
                        </mat-tree-node>
                    </mat-tree>
                </div>
            </ng-template>

            <div *ngIf="hasError" class="error-msg">Field is required</div>
        </div>
    `,
    styles: [
        `
            .form-field {
                margin-bottom: 12px;
            }

            .tree-control label {
                display: block;
                margin-bottom: 8px;
                font-weight: 500;
            }

            .required {
                color: red;
            }

            .tree-container {
                border: 1px solid #ccc;
                border-radius: 4px;
                padding: 8px;
                max-height: 400px;
                overflow-y: auto;
                background-color: white;
            }

            .tree-node-content {
                display: flex;
                align-items: center;
            }

            .nested-children {
                margin-left: 32px;
            }

            .tree-node-label {
                padding: 4px 8px;
                cursor: pointer;
                display: inline-block;
                border-radius: 4px;
                transition: background-color 0.2s;
            }

            .tree-node-label:hover {
                background-color: #f5f5f5;
            }

            .tree-node-label.selected {
                background-color: #e3f2fd;
                font-weight: 500;
            }

            .tree-node-label.leaf {
                margin-left: 4px;
            }

            /* Expand icon rotation when expanded */
            button.mat-icon-button.expanded .mat-icon {
                transform: rotate(90deg);
                transition: transform 200ms ease-in-out;
            }

            .loading-indicator,
            .empty-message {
                padding: 16px;
                text-align: center;
                color: #666;
            }

            .error-msg {
                color: red;
                font-size: 0.8em;
                margin-top: 4px;
            }

            mat-tree {
                background: transparent;
            }

            mat-tree-node {
                min-height: 36px;
            }
        `,
    ],
})
export class TreeControlComponent implements OnInit {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    private readonly domainService = inject(DomainData);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly loading = signal<boolean>(false);
    protected readonly selectedNodeCode = signal<string | null>(null);

    protected readonly dataSource = new MatTreeNestedDataSource<TreeNode>();
    protected readonly treeControl = new NestedTreeControl<TreeNode>((node) => node.children ?? []);

    private nodeMap = new Map<string, TreeNode>();

    ngOnInit(): void {
        this.initializeSelectedValue();

        if (this.config.options) {
            this.loadStaticOptions();
        } else if (this.config.categoryCode) {
            this.loadDynamicOptions();
        }
    }

    /**
     * Initialize the selected value from form control
     */
    private initializeSelectedValue(): void {
        const currentValue = this.group.get(this.config.key)?.value;
        if (currentValue) {
            this.selectedNodeCode.set(currentValue);
        }
    }

    /**
     * Load static options from config
     */
    private loadStaticOptions(): void {
        const treeNodes = this.convertOptionsToTree(this.config.options!);
        this.updateTreeData(treeNodes);
    }

    /**
     * Load dynamic options from domain data service
     */
    private loadDynamicOptions(): void {
        const { categoryCode, dependentOn } = this.config;

        if (!dependentOn) {
            this.loadIndependentTree(categoryCode!);
        } else {
            this.loadDependentTree(categoryCode!, dependentOn);
        }
    }

    /**
     * Load tree data that doesn't depend on another control
     */
    private loadIndependentTree(categoryCode: string): void {
        this.loading.set(true);
        this.domainService
            .getDomainValues(categoryCode)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (data) => this.handleTreeDataLoaded(data),
                error: (err) => this.handleTreeDataError(err),
            });
    }

    /**
     * Load tree data that depends on another control's value
     */
    private loadDependentTree(categoryCode: string, dependentOn: string): void {
        const parentControl = this.group.get(dependentOn);
        if (!parentControl) {
            console.warn(`Parent control "${dependentOn}" not found`);
            return;
        }

        parentControl.valueChanges
            .pipe(
                startWith(parentControl.value),
                distinctUntilChanged(),
                switchMap((parentValue) => {
                    if (parentValue == null) {
                        return of([]);
                    }
                    this.loading.set(true);
                    return this.domainService.getDomainValues(categoryCode);
                }),
                takeUntilDestroyed(this.destroyRef)
            )
            .subscribe({
                next: (data) => {
                    const parentValue = this.group.get(dependentOn)?.value;
                    this.handleTreeDataLoaded(data, parentValue);
                },
                error: (err) => this.handleTreeDataError(err),
            });
    }

    /**
     * Handle successful tree data load
     */
    private handleTreeDataLoaded(data: DomainValue[], parentFilter?: string | null): void {
        const treeNodes = this.convertDomainToTree(data);
        this.updateTreeData(treeNodes, parentFilter);
        this.loading.set(false);
    }

    /**
     * Handle tree data load error
     */
    private handleTreeDataError(error: any): void {
        console.error('Error loading tree data:', error);
        this.loading.set(false);
    }

    /**
     * Update tree data source with new nodes
     */
    private updateTreeData(nodes: TreeNode[], parentFilter?: string | null): void {
        this.dataSource.data = this.buildTreeStructure(nodes, parentFilter);
        this.treeControl.dataNodes = this.dataSource.data;
        this.expandToNode(this.selectedNodeCode());
    }

    /**
     * Build hierarchical tree structure from flat list
     */
    private buildTreeStructure(nodes: TreeNode[], parentFilter?: string | null): TreeNode[] {
        const nodeMap = new Map<string, TreeNode>();
        const rootNodes: TreeNode[] = [];

        // Create node map
        nodes.forEach((node) => {
            nodeMap.set(node.code, { ...node, children: [] });
        });

        // Build hierarchy
        nodes.forEach((node) => {
            const treeNode = nodeMap.get(node.code)!;
            const isRoot =
                parentFilter === undefined ? !node.parentCode : node.parentCode === parentFilter;

            if (isRoot) {
                rootNodes.push(treeNode);
            } else if (node.parentCode) {
                const parent = nodeMap.get(node.parentCode);
                if (parent) {
                    parent.children!.push(treeNode);
                }
            }
        });

        this.nodeMap = nodeMap;
        return rootNodes;
    }

    /**
     * Expand the tree to ensure a node is visible (expand all parents)
     */
    private expandToNode(code: string | null | undefined): void {
        if (!code) return;

        const node = this.nodeMap.get(code);
        if (!node) return;

        // Walk up parent chain and expand all ancestors
        let parentCode = node.parentCode;
        while (parentCode) {
            const parent = this.nodeMap.get(parentCode);
            if (!parent) break;
            this.treeControl.expand(parent);
            parentCode = parent.parentCode;
        }
    }

    /**
     * Convert static options to tree nodes
     */
    private convertOptionsToTree(
        options: { label: string; value: any; parentCode?: string }[]
    ): TreeNode[] {
        return options.map((opt) => ({
            code: String(opt.value),
            displayText: opt.label,
            parentCode: opt.parentCode || null,
        }));
    }

    /**
     * Convert domain values to tree nodes
     */
    private convertDomainToTree(data: DomainValue[]): TreeNode[] {
        return data.map((item) => ({
            code: String(item.code),
            displayText: item.displayText,
            parentCode: (item as any).parentCode || null,
        }));
    }

    /**
     * Check if node has children (used by mat-tree)
     */
    protected hasChild = (_: number, node: TreeNode): boolean => !!node.children?.length;

    /**
     * Handle node selection
     */
    protected selectNode(node: TreeNode): void {
        this.selectedNodeCode.set(node.code);
        const control = this.group.get(this.config.key);
        if (control) {
            control.setValue(node.code);
            control.markAsTouched();
        }
        this.expandToNode(node.code);
    }

    /**
     * Check if node is currently selected
     */
    protected isSelected(node: TreeNode): boolean {
        return this.selectedNodeCode() === node.code;
    }

    protected get isRequired(): boolean {
        return !!this.config.validators?.['required'];
    }

    protected get hasError(): boolean {
        const control = this.group.get(this.config.key);
        return (control?.invalid && control?.touched) ?? false;
    }
}
