import { Component, Input, OnInit, inject, signal, DestroyRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup, FormControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startWith, switchMap, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { of } from 'rxjs';
import { MatTreeNestedDataSource, MatTreeModule } from '@angular/material/tree';
import { NestedTreeControl } from '@angular/cdk/tree';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { trigger, state, style, transition, animate } from '@angular/animations';

import { ControlDefinition } from '../../../core/models/form-schema.interface';
import { DomainData, DomainValue } from '../../../core/services/domain-data.service';
import { InputControlComponent } from './input-control.component';

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
    imports: [
        CommonModule,
        ReactiveFormsModule,
        MatTreeModule,
        MatIconModule,
        MatButtonModule,
        InputControlComponent,
    ],
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
                    <app-input-control
                        [config]="searchConfig"
                        [group]="searchGroup"
                    ></app-input-control>
                    <mat-tree [dataSource]="dataSource" [treeControl]="treeControl">
                        <!-- Tree node template for expandable nodes -->
                        <mat-nested-tree-node
                            *matTreeNodeDef="let node; when: hasChild; trackBy: trackByCode"
                            [attr.aria-expanded]="treeControl.isExpanded(node)"
                            [attr.aria-level]="getNodeLevel(node)"
                            [attr.aria-setsize]="getNodeSetSize(node)"
                            [attr.aria-posinset]="getNodePosition(node)"
                            role="treeitem"
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
                                    matTreeNodeToggle
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
                                [@expandCollapse]="
                                    treeControl.isExpanded(node) ? 'expanded' : 'collapsed'
                                "
                            >
                                <ng-container matTreeNodeOutlet></ng-container>
                            </div>
                        </mat-nested-tree-node>

                        <!-- Tree node template for leaf nodes -->
                        <mat-tree-node
                            *matTreeNodeDef="let node; trackBy: trackByCode"
                            [attr.aria-level]="getNodeLevel(node)"
                            [attr.aria-setsize]="getNodeSetSize(node)"
                            [attr.aria-posinset]="getNodePosition(node)"
                            role="treeitem"
                        >
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

            .search-field {
                width: 100%;
                margin-bottom: 8px;
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
    animations: [
        trigger('expandCollapse', [
            state('collapsed', style({ height: '0px', overflow: 'hidden', opacity: 0 })),
            state('expanded', style({ height: '*', overflow: 'visible', opacity: 1 })),
            transition('collapsed <=> expanded', animate('300ms ease-in-out')),
        ]),
    ],
})
export class TreeControlComponent implements OnInit {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    private readonly domainService = inject(DomainData);
    private readonly destroyRef = inject(DestroyRef);

    protected readonly loading = signal<boolean>(false);
    protected readonly selectedNodeCode = signal<string | null>(null);
    protected readonly searchControl = new FormControl('');
    protected readonly searchGroup = new FormGroup({ search: this.searchControl });
    protected readonly searchConfig: ControlDefinition = {
        key: 'search',
        type: 'text',
        label: 'Search',
        placeholder: 'Filter nodes...',
    };

    protected readonly dataSource = new MatTreeNestedDataSource<TreeNode>();
    protected readonly treeControl = new NestedTreeControl<TreeNode>((node) => node.children ?? []);

    private nodeMap = new Map<string, TreeNode>();
    private originalData: TreeNode[] = [];

    ngOnInit(): void {
        this.initializeSelectedValue();

        // Set up search filtering
        this.searchControl.valueChanges
            .pipe(debounceTime(300), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.applyFilter();
            });

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
        let treeNodes = this.convertDomainToTree(data);
        if (parentFilter !== undefined) {
            treeNodes = treeNodes.filter((node) => node.parentCode === parentFilter);
        }
        this.updateTreeData(treeNodes);
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
        this.originalData = nodes;
        this.applyFilter();
    }

    private applyFilter(): void {
        const searchTerm = this.searchControl.value?.toLowerCase() || '';
        let filteredNodes = this.originalData;

        if (searchTerm) {
            filteredNodes = this.filterTreeNodes(this.originalData, searchTerm);
        }

        this.dataSource.data = this.buildTreeStructure(filteredNodes);
        this.treeControl.dataNodes = this.dataSource.data;
        this.expandToNode(this.selectedNodeCode());

        // Expand all nodes if searching to show matches
        if (searchTerm) {
            this.treeControl.expandAll();
        }
    }

    /**
     * Build hierarchical tree structure from flat list
     */
    private buildTreeStructure(nodes: TreeNode[]): TreeNode[] {
        const nodeMap = new Map<string, TreeNode>();
        const rootNodes: TreeNode[] = [];

        // Create node map
        nodes.forEach((node) => {
            nodeMap.set(node.code, { ...node, children: [] });
        });

        // Build hierarchy
        nodes.forEach((node) => {
            const treeNode = nodeMap.get(node.code)!;
            if (!node.parentCode) {
                rootNodes.push(treeNode);
            } else {
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
     * Filter tree nodes based on search term, keeping ancestors of matches
     */
    private filterTreeNodes(nodes: TreeNode[], searchTerm: string): TreeNode[] {
        const matches = new Set<string>();
        const ancestors = new Set<string>();

        // Find all matching nodes
        const findMatches = (nodeList: TreeNode[]) => {
            nodeList.forEach((node) => {
                if (node.displayText.toLowerCase().includes(searchTerm)) {
                    matches.add(node.code);
                    // Add all ancestors
                    let parentCode = node.parentCode;
                    while (parentCode) {
                        ancestors.add(parentCode);
                        const parent = this.originalData.find((n) => n.code === parentCode);
                        parentCode = parent?.parentCode || null;
                    }
                }
                if (node.children) {
                    findMatches(node.children);
                }
            });
        };

        findMatches(nodes);

        // Return nodes that are matches or ancestors
        return this.originalData.filter(
            (node) => matches.has(node.code) || ancestors.has(node.code)
        );
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
    private convertOptionsToTree(options: any[]): TreeNode[] {
        return options as TreeNode[];
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

    /**
     * Get the level of a node in the tree
     */
    protected getNodeLevel(node: TreeNode): number {
        let level = 0;
        let parentCode = node.parentCode;
        while (parentCode) {
            level++;
            const parent = this.nodeMap.get(parentCode);
            parentCode = parent?.parentCode || null;
        }
        return level + 1;
    }

    /**
     * Get the set size (number of siblings) for a node
     */
    protected getNodeSetSize(node: TreeNode): number {
        if (!node.parentCode) {
            return this.dataSource.data.length;
        }
        const parent = this.nodeMap.get(node.parentCode);
        return parent?.children?.length || 1;
    }

    /**
     * Get the position of a node among its siblings
     */
    protected getNodePosition(node: TreeNode): number {
        if (!node.parentCode) {
            return this.dataSource.data.findIndex((n) => n.code === node.code) + 1;
        }
        const parent = this.nodeMap.get(node.parentCode);
        return (parent?.children?.findIndex((n) => n.code === node.code) || 0) + 1;
    }

    /**
     * TrackBy function for performance
     */
    protected trackByCode(index: number, node: TreeNode): string {
        return node.code;
    }
}
