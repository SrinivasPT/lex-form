# GenericFormComponent Usage Guide

## Overview

`GenericFormComponent` is a high-level, batteries-included component for CRUD forms. It encapsulates:

-   Form content loading (schema + data + domain data)
-   Header with title and alerts
-   Loading/saving states with spinner
-   Standard CRUD actions
-   Route integration

## When to Use Each Component

### Use `GenericFormComponent` when:

-   Building standard CRUD forms (80% of cases)
-   Need automatic loading/saving state management
-   Want integrated header, alerts, and spinner
-   Route-based form navigation

### Use `DynamicFormComponent` when:

-   Building custom workflows (wizards, multi-step forms)
-   Need full control over state management
-   Embedding forms within other components
-   Custom validation or business logic
-   A/B testing different layouts
-   Integration with external state (NgRx, signals)

## Usage Examples

### 1. Simplest Usage - Route Resolver

```typescript
// app.routes.ts
{
  path: 'employee/:id',
  component: DemoAppComponent,
  resolve: { formContent: FormContentResolver }
}

// demo-app.component.ts
@Component({
  template: `<lib-generic-form (save)="onSave($event)" />`
})
export class DemoAppComponent {
  onSave(form: FormGroup) {
    console.log('Saved:', form.value);
  }
}
```

### 2. Direct Loading by IDs

```typescript
@Component({
    template: `
        <lib-generic-form
            [formId]="'employee-form'"
            [entityCode]="'EMP_001'"
            (save)="onSave($event)"
        />
    `,
})
export class EmployeeEditComponent {}
```

### 3. Custom Configuration

```typescript
@Component({
    template: `
        <lib-generic-form
            [config]="formConfig"
            [customActions]="customActions"
            (save)="onSave($event)"
            (cancel)="onCancel()"
            (formReady)="onFormReady($event)"
        />
    `,
})
export class CustomFormComponent {
    formConfig: GenericFormConfig = {
        formId: 'employee-form',
        entityCode: 'EMP_001',
        showHeader: true,
        saveSuccessMessage: 'Employee saved!',
        autoDismissMs: 5000,
    };

    customActions: FormAction[] = [
        {
            label: 'Save & Close',
            type: 'submit',
            handler: (form) => this.saveAndClose(form),
            class: 'btn-primary',
        },
        {
            label: 'Reset',
            handler: (form) => form.reset(),
            class: 'btn-secondary',
        },
    ];
}
```

### 4. Without Header (Embedded)

```typescript
@Component({
    template: `
        <div class="modal-content">
            <h2>Quick Edit</h2>
            <lib-generic-form
                [formId]="'employee-form'"
                [entityCode]="employeeId"
                [showHeader]="false"
                [customActions]="modalActions"
            />
        </div>
    `,
})
export class EmployeeQuickEditModal {}
```

## Advanced: Drop Down to DynamicFormComponent

When you need full control, use `DynamicFormComponent` directly:

```typescript
@Component({
    template: `
        <div class="wizard-container">
            <wizard-steps [currentStep]="currentStep" />

            <app-dynamic-form
                [schema]="getCurrentStepSchema()"
                [initialData]="wizardData"
                [actions]="getStepActions()"
                (formReady)="onStepFormReady($event)"
            />
        </div>
    `,
})
export class MultiStepWizardComponent {
    // Full control over form lifecycle
    onStepFormReady(form: FormGroup) {
        // Custom validation per step
        // Progress tracking
        // External state management
    }
}
```

## API Reference

### Inputs

| Property             | Type                | Default                      | Description                            |
| -------------------- | ------------------- | ---------------------------- | -------------------------------------- |
| `formId`             | `string`            | -                            | Form ID to load from backend           |
| `entityCode`         | `string`            | -                            | Entity/record ID (optional for new)    |
| `showHeader`         | `boolean`           | `true`                       | Show form header with title/alerts     |
| `saveSuccessMessage` | `string`            | `'Data saved successfully!'` | Success message text                   |
| `autoDismissMs`      | `number`            | `3000`                       | Auto-dismiss delay (0 = no dismiss)    |
| `customActions`      | `FormAction[]`      | -                            | Override default actions               |
| `trackByField`       | `string`            | `'id'`                       | Field for entity change tracking       |
| `config`             | `GenericFormConfig` | -                            | Alternative: pass all config as object |

### Outputs

| Event       | Type        | Description                       |
| ----------- | ----------- | --------------------------------- |
| `save`      | `FormGroup` | Emitted when form is saved        |
| `cancel`    | `void`      | Emitted when cancel is clicked    |
| `formReady` | `FormGroup` | Emitted when FormGroup is created |

## Migration from Manual Implementation

**Before (140+ lines):**

```typescript
export class DemoAppComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private formContentService = inject(FormContentService);
    private destroyRef = inject(DestroyRef);

    protected formState!: FormContentSignals;
    protected form = signal<FormGroup | null>(null);

    // ... 100+ lines of boilerplate
}
```

**After (40 lines):**

```typescript
export class DemoAppComponent {
    protected readonly customActions: FormAction[] = [
        /* ... */
    ];

    onFormReady(form: FormGroup) {
        /* ... */
    }
    onSave(form: FormGroup) {
        /* ... */
    }
}
```

## Best Practices

1. **Start with GenericFormComponent** for all forms
2. **Drop to DynamicFormComponent** only when you need custom control flow
3. **Use route resolvers** for cleaner components
4. **Provide custom actions** instead of extending the component
5. **Use trackByField** for forms with entity navigation
