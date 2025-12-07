import { Component, Input, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, switchMap, distinctUntilChanged } from 'rxjs/operators';
import { of } from 'rxjs';
import { FlatTreeControl } from '@angular/cdk/tree';
import { MatTreeFlatDataSource, MatTreeFlattener, MatTreeModule } from '@angular/material/tree';
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
    level?: number;
    hasChildren?: boolean;
}

/**
 * Flat node structure for Angular Material tree
 */
interface FlatTreeNode {
    code: string;
    displayText: string;
    level: number;
    expandable: boolean;
}

@Component({
    selector: 'app-tree-control',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, MatTreeModule, MatIconModule, MatButtonModule],
    template: `
        <div [formGroup]="group" class="form-field tree-control">
            <label>
                {{ config.label }}
                @if (isRequired) {
                <span class="required">*</span>
                }
            </label>

            @if (loading()) {
            <div class="loading-indicator">Loading tree data...</div>
            } @else if (dataSource.data.length === 0) {
            <div class="empty-message">No data available</div>
            } @else {
            <div class="tree-container">
                <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
                    <!-- Tree node template for expandable nodes -->
                    <mat-tree-node *matTreeNodeDef="let node; when: hasChild" matTreeNodePadding>
                        <button
                            mat-icon-button
                            matTreeNodeToggle
                            [attr.aria-label]="'Toggle ' + node.displayText"
                        >
                            <mat-icon class="mat-icon-rtl-mirror">
                                {{ treeControl.isExpanded(node) ? 'expand_more' : 'chevron_right' }}
                            </mat-icon>
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
                    </mat-tree-node>

                    <!-- Tree node template for leaf nodes -->
                    <mat-tree-node *matTreeNodeDef="let node" matTreeNodePadding>
                        <button mat-icon-button disabled></button>
                        <span
                            class="tree-node-label leaf"
                            (click)="selectNode(node)"
                            [class.selected]="isSelected(node)"
                            [attr.role]="'button'"
                            [attr.tabindex]="0"
                            (keydown.enter)="selectNode(node)"
                            (keydown.space)="selectNode(node)"
                        >
                            {{ node.displayText }}
                        </span>
                    </mat-tree-node>
                </mat-tree>
            </div>
            } @if (hasError) {
            <div class="error-msg">Field is required</div>
            }
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

    private domainService = inject(DomainData);
    private destroyRef = inject(DestroyRef);

    loading = signal<boolean>(false);
    selectedNodeCode = signal<string | null>(null);

    // Tree control setup
    private transformer = (node: TreeNode, level: number): FlatTreeNode => {
        return {
            code: node.code,
            displayText: node.displayText,
            level: level,
            expandable: !!node.hasChildren,
        };
    };

    treeControl = new FlatTreeControl<FlatTreeNode>(
        (node) => node.level,
        (node) => node.expandable
    );

    treeFlattener = new MatTreeFlattener(
        this.transformer,
        (node) => node.level,
        (node) => node.expandable,
        (node) => this.getChildren(node)
    );

    dataSource = new MatTreeFlatDataSource(this.treeControl, this.treeFlattener);

    private allNodes: TreeNode[] = [];

    ngOnInit() {
        // Initialize selected value from form control
        const currentValue = this.group.get(this.config.key)?.value;
        if (currentValue) {
            this.selectedNodeCode.set(currentValue);
        }

        // 1. Static Options (converted to tree structure)
        if (this.config.options) {
            const treeNodes = this.convertOptionsToTree(this.config.options);
            this.allNodes = treeNodes;
            this.dataSource.data = this.buildTreeStructure(treeNodes);
            return;
        }

        // 2. Dynamic Options from domain data
        if (this.config.categoryCode) {
            const { categoryCode, dependentOn } = this.config;

            if (!dependentOn) {
                // Independent tree - load once
                this.loading.set(true);
                this.domainService
                    .getDomainValues(categoryCode)
                    .pipe(takeUntilDestroyed(this.destroyRef))
                    .subscribe({
                        next: (data) => {
                            this.allNodes = this.convertDomainToTree(data);
                            this.dataSource.data = this.buildTreeStructure(this.allNodes);
                            this.loading.set(false);
                        },
                        error: (err) => {
                            console.error('Error loading tree data:', err);
                            this.loading.set(false);
                        },
                    });
            } else {
                // Dependent tree - reload when parent changes
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
                            return this.domainService.getDomainValues(categoryCode, parentValue);
                        }),
                        takeUntilDestroyed(this.destroyRef)
                    )
                    .subscribe({
                        next: (data) => {
                            this.allNodes = this.convertDomainToTree(data);
                            this.dataSource.data = this.buildTreeStructure(this.allNodes);
                            this.loading.set(false);
                        },
                        error: (err) => {
                            console.error('Error loading dependent tree data:', err);
                            this.loading.set(false);
                        },
                    });
            }
        }
    }

    /**
     * Build hierarchical tree structure from flat list
     */
    private buildTreeStructure(nodes: TreeNode[]): TreeNode[] {
        const nodeMap = new Map<string, TreeNode>();
        const rootNodes: TreeNode[] = [];

        // First pass: create map and mark nodes with children
        nodes.forEach((node) => {
            nodeMap.set(node.code, { ...node, hasChildren: false });
        });

        // Second pass: build hierarchy
        nodes.forEach((node) => {
            const treeNode = nodeMap.get(node.code)!;
            if (!node.parentCode) {
                rootNodes.push(treeNode);
            } else {
                const parent = nodeMap.get(node.parentCode);
                if (parent) {
                    parent.hasChildren = true;
                }
            }
        });

        return rootNodes;
    }

    /**
     * Get children of a tree node
     */
    private getChildren(node: TreeNode): TreeNode[] {
        return this.allNodes
            .filter((n) => n.parentCode === node.code)
            .map((n) => {
                const hasChildren = this.allNodes.some((child) => child.parentCode === n.code);
                return { ...n, hasChildren };
            });
    }

    /**
     * Convert static options to tree nodes
     */
    private convertOptionsToTree(options: { label: string; value: any }[]): TreeNode[] {
        return options.map((opt) => ({
            code: String(opt.value),
            displayText: opt.label,
            parentCode: null,
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
     * Check if node has children
     */
    hasChild = (_: number, node: FlatTreeNode): boolean => node.expandable;

    /**
     * Handle node selection
     */
    selectNode(node: FlatTreeNode): void {
        this.selectedNodeCode.set(node.code);
        const control = this.group.get(this.config.key);
        if (control) {
            control.setValue(node.code);
            control.markAsTouched();
        }
    }

    /**
     * Check if node is selected
     */
    isSelected(node: FlatTreeNode): boolean {
        return this.selectedNodeCode() === node.code;
    }

    get isRequired(): boolean {
        const control = this.group.get(this.config.key);
        return control?.hasValidator(() => ({ required: true })) ?? false;
    }

    get hasError(): boolean {
        const control = this.group.get(this.config.key);
        return (control?.invalid && control?.touched) ?? false;
    }
}
