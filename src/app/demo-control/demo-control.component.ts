import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup } from '@angular/forms';
import { TreeControlComponent } from '../shared/components/controls/tree-control.component';
import { ControlDefinition } from '../core/models/form-schema.interface';

interface TreeOption {
    code: string;
    displayText: string;
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
            { code: 'electronics', displayText: 'Electronics' },
            { code: 'computers', displayText: 'Computers', parentCode: 'electronics' },
            { code: 'laptops', displayText: 'Laptops', parentCode: 'computers' },
            { code: 'desktops', displayText: 'Desktops', parentCode: 'computers' },
            { code: 'phones', displayText: 'Phones', parentCode: 'electronics' },
            { code: 'smartphones', displayText: 'Smartphones', parentCode: 'phones' },
            { code: 'featurephones', displayText: 'Feature Phones', parentCode: 'phones' },
            { code: 'clothing', displayText: 'Clothing' },
            { code: 'men', displayText: 'Men', parentCode: 'clothing' },
            { code: 'shirts', displayText: 'Shirts', parentCode: 'men' },
            { code: 'pants', displayText: 'Pants', parentCode: 'men' },
            { code: 'women', displayText: 'Women', parentCode: 'clothing' },
            { code: 'dresses', displayText: 'Dresses', parentCode: 'women' },
            { code: 'skirts', displayText: 'Skirts', parentCode: 'women' },
        ] as any,
    };

    constructor(private fb: FormBuilder) {}

    ngOnInit() {
        this.formGroup = this.fb.group({
            treeField: [''],
        });
    }
}
