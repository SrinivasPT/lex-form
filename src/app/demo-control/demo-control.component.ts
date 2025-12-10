import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TreeControlComponent } from '../shared/components/controls/tree-control.component';
import { ControlDefinition } from '../core/models/form-schema.interface';

interface TreeOption {
    label: string;
    value: any;
    parentCode?: string;
}

@Component({
    selector: 'app-demo-control',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, TreeControlComponent],
    template: `
        <div style="padding: 20px;">
            <h2>Tree Control Demo</h2>
            <form [formGroup]="formGroup">
                <app-tree-control [config]="treeConfig" [group]="formGroup"></app-tree-control>
            </form>
            <div style="margin-top: 20px;">
                <h3>Selected Value:</h3>
                <pre>{{ formGroup.get('treeField')?.value }}</pre>
            </div>
        </div>
    `,
})
export class DemoControlComponent implements OnInit {
    formGroup!: FormGroup;

    treeConfig: ControlDefinition = {
        key: 'treeField',
        type: 'tree',
        label: 'Select from Tree',
        options: [
            { label: 'Electronics', value: 'electronics' },
            { label: 'Computers', value: 'computers', parentCode: 'electronics' },
            { label: 'Laptops', value: 'laptops', parentCode: 'computers' },
            { label: 'Desktops', value: 'desktops', parentCode: 'computers' },
            { label: 'Phones', value: 'phones', parentCode: 'electronics' },
            { label: 'Smartphones', value: 'smartphones', parentCode: 'phones' },
            { label: 'Feature Phones', value: 'featurephones', parentCode: 'phones' },
            { label: 'Clothing', value: 'clothing' },
            { label: 'Men', value: 'men', parentCode: 'clothing' },
            { label: 'Shirts', value: 'shirts', parentCode: 'men' },
            { label: 'Pants', value: 'pants', parentCode: 'men' },
            { label: 'Women', value: 'women', parentCode: 'clothing' },
            { label: 'Dresses', value: 'dresses', parentCode: 'women' },
            { label: 'Skirts', value: 'skirts', parentCode: 'women' },
        ] as any,
    };

    constructor(private fb: FormBuilder) {}

    ngOnInit() {
        this.formGroup = this.fb.group({
            treeField: [''],
        });
    }
}
