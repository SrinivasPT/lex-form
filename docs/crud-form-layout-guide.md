# CRUD Form Layout Guide

## Overview

The **CrudFormLayoutComponent** provides consistent UI chrome for all CRUD forms in the application, ensuring developers don't have to reimplement headers, spinners, and alerts.

## Architecture

```
CrudFormLayoutComponent (app-level)
├─ Layout (95vw, centering, padding)
├─ Form Header (title, alerts)
├─ Loading Spinner
└─ <ng-content> for form content
```

## Usage

### Option 1: With GenericFormComponent (Recommended)

For standard CRUD forms using the library's GenericFormComponent:

```typescript
import { CrudFormLayoutComponent } from '../shared/layout/crud-form-layout.component';
import { GenericFormComponent, FormContentService } from 'form-lib';

@Component({
    selector: 'app-employee-form',
    standalone: true,
    imports: [CrudFormLayoutComponent, GenericFormComponent],
    template: `
        <app-crud-form-layout
            [formState]="formState()"
            [showHeader]="true"
            [loadingMessage]="'Loading employee...'"
        >
            <lib-generic-form [customActions]="actions" (save)="onSave($event)" />
        </app-crud-form-layout>
    `,
})
export class EmployeeFormComponent implements OnInit {
    private formContentService = inject(FormContentService);
    protected formState = signal<any>(null);

    ngOnInit() {
        // Load form content and create state
        this.route.data.subscribe((data) => {
            this.formState.set(this.formContentService.createFormState(data['formContent']));
        });
    }
}
```

### Option 2: With Custom Forms

For developers building custom forms from scratch:

```typescript
import { CrudFormLayoutComponent } from '../shared/layout/crud-form-layout.component';
import { FormContentService } from 'form-lib';

@Component({
    selector: 'app-custom-form',
    standalone: true,
    imports: [CrudFormLayoutComponent, ReactiveFormsModule],
    template: `
        <app-crud-form-layout
            [formState]="formState"
            [showHeader]="true"
            [loadingMessage]="'Loading data...'"
        >
            <!-- Your custom form content -->
            <form [formGroup]="myForm" (ngSubmit)="onSubmit()">
                <input formControlName="name" />
                <input formControlName="email" />
                <button type="submit">Save</button>
            </form>
        </app-crud-form-layout>
    `,
})
export class CustomFormComponent {
    private formContentService = inject(FormContentService);

    // Create form state for layout component
    protected formState = this.formContentService.createFormState();

    // Your custom form logic
    myForm = this.fb.group({
        name: [''],
        email: [''],
    });

    onSubmit() {
        // Use formContentService.handleSave() for consistent behavior
        this.formContentService
            .handleSave(this.formState, 'ENTITY_ID', this.myForm.value, {
                successMessage: 'Saved!',
                autoDismissMs: 3000,
            })
            .subscribe();
    }
}
```

## Benefits

✅ **Consistency**: All forms have the same header, alerts, spinner, and layout  
✅ **DRY**: Developers don't reimplement UI chrome  
✅ **Maintainability**: Update styling/behavior in one place  
✅ **Flexibility**: Still allows custom form logic inside the layout

## Component Responsibilities

| Component                   | Responsibility                                     |
| --------------------------- | -------------------------------------------------- |
| **CrudFormLayoutComponent** | Layout, header, alerts, spinner (UI chrome)        |
| **GenericFormComponent**    | Form rendering, actions, save/cancel (form logic)  |
| **Custom Form Component**   | Custom business logic, validation, field rendering |

## Best Practices

1. **Always use CrudFormLayoutComponent** for CRUD forms to maintain consistency
2. **Pass formState** to enable header, alerts, and spinner
3. **Use FormContentService** for state management and save operations
4. **Keep custom logic inside** the `<ng-content>` area
5. **Don't duplicate** header/spinner/alert logic in custom forms
