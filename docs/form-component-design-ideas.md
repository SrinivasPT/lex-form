# Form Component Design Ideas

**Date:** January 10, 2026  
**Status:** Discussion Document  
**Purpose:** Evaluate and decide on form component architecture for better control and reusability

---

## Current Problem Statement

### The Issue

In `FormAdminControlComponent`, we need to perform form-level actions (like saving, validating, resetting), but we **don't have direct access to the form instance** because:

1. The `FormGroup` is created **inside** `DynamicFormComponent`
2. The form is encapsulated within the component's internal state
3. Parent components cannot access the form to call methods like `form.value`, `form.markAllAsTouched()`, etc.

### Current Architecture

```typescript
// FormAdminControlComponent (Parent)
@Component({
    template: `
        <app-dynamic-form [schema]="schema" [initialData]="initialValues"> </app-dynamic-form>
    `,
})
export class FormAdminControlComponent {
    // ❌ No access to the form instance!
    // Cannot call: form.value, form.reset(), form.markAllAsTouched()
}

// DynamicFormComponent (Child)
export class DynamicFormComponent {
    form = signal<FormGroup | null>(null); // Created internally

    ngOnInit() {
        const formGroup = this.formGenerator.toFormGroup(compiled);
        this.form.set(formGroup); // Hidden from parent
    }
}
```

---

## Design Options

### Option 1: External Form Creation (Form Outside)

**Approach:** Create the form in the parent component and pass it as an input to `DynamicFormComponent`.

#### Implementation

```typescript
// Parent Component
export class FormAdminControlComponent {
    private formGenerator = inject(FormGeneratorService);
    private resolver = inject(SchemaResolverService);

    form = signal<FormGroup | null>(null);
    schema = signal<FormSchema | null>(null);

    ngOnInit() {
        this.loadSchema().subscribe((rawSchema) => {
            const compiled = this.resolver.resolve(rawSchema);
            const formGroup = this.formGenerator.toFormGroup(compiled);

            // Patch initial data
            if (this.initialData) {
                this.formGenerator.patchForm(formGroup, this.initialData, compiled);
            }

            this.schema.set(compiled);
            this.form.set(formGroup);
        });
    }

    onSave() {
        // ✅ Direct access to form!
        console.log(this.form()?.value);
        this.http.post('/api/save', this.form()?.value).subscribe();
    }

    onReset() {
        this.form()?.reset();
    }
}

// DynamicFormComponent (Simplified)
@Component({
    selector: 'app-dynamic-form',
    template: `
        <form [formGroup]="form">
            @for (section of schema.sections; track section.key) {
            <app-dynamic-control [config]="section" [group]="form"> </app-dynamic-control>
            }
        </form>
    `,
})
export class DynamicFormComponent {
    @Input({ required: true }) form!: FormGroup;
    @Input({ required: true }) schema!: FormSchema;
    // No form creation logic - just renders
}
```

#### Pros

-   ✅ **Parent has full control** over form creation, patching, and lifecycle
-   ✅ **Simplifies `DynamicFormComponent`** - becomes a pure rendering component
-   ✅ **Better separation of concerns** - logic in parent, rendering in child
-   ✅ **Easier testing** - can test form logic independently
-   ✅ **More flexible** - parent can manipulate form before/after rendering

#### Cons

-   ❌ **Boilerplate in every parent** - each consumer must create the form
-   ❌ **Violates encapsulation** - form creation details exposed to parent
-   ❌ **More work for simple use cases** - demo apps need more code

---

### Option 2: Form Output Event (Current + Output)

**Approach:** Keep current architecture but emit the form instance to the parent via `@Output()`.

#### Implementation

```typescript
// DynamicFormComponent
export class DynamicFormComponent {
    @Output() formReady = new EventEmitter<FormGroup>();

    ngOnInit() {
        const formGroup = this.formGenerator.toFormGroup(compiled);
        this.form.set(formGroup);
        this.formReady.emit(formGroup); // Emit to parent
    }
}

// Parent Component
@Component({
    template: `
        <app-dynamic-form
            [schema]="schema"
            [initialData]="initialValues"
            (formReady)="onFormReady($event)"
        >
        </app-dynamic-form>
    `,
})
export class FormAdminControlComponent {
    form = signal<FormGroup | null>(null);

    onFormReady(form: FormGroup) {
        this.form.set(form); // Store reference
    }

    onSave() {
        console.log(this.form()?.value);
    }
}
```

#### Pros

-   ✅ **Minimal change** - keeps current architecture
-   ✅ **Parent gets form access** - can perform form-level actions
-   ✅ **Simple for consumers** - still encapsulates form creation
-   ✅ **Backward compatible** - event is optional

#### Cons

-   ❌ **Indirect access** - relies on event timing
-   ❌ **Potential race conditions** - parent must wait for `formReady`
-   ❌ **Still duplicates logic** - both parent and child manage form state
-   ❌ **Less intuitive** - form exists in two places (child creates, parent stores)

---

### Option 3: Generic Form Component with Configurable Actions

**Approach:** Make `DynamicFormComponent` a fully configurable, reusable form component with action buttons and callbacks.

#### Implementation

```typescript
// Generic DynamicFormComponent
export interface FormAction {
    label: string;
    type?: 'submit' | 'button' | 'reset';
    disabled?: (form: FormGroup) => boolean;
    handler: (form: FormGroup) => void;
    class?: string;
}

@Component({
    selector: 'app-dynamic-form',
    template: `
        <form [formGroup]="form()!" (ngSubmit)="onSubmit()">
            <div class="sections-wrapper">
                @for (section of resolvedSchema()?.sections; track section.key) {
                    <app-dynamic-control [config]="section" [group]="form()!">
                    </app-dynamic-control>
                }
            </div>

            <!-- Configurable Actions -->
            <div class="form-actions">
                @for (action of actions; track action.label) {
                    <button
                        [type]="action.type || 'button'"
                        [disabled]="action.disabled?.(form()!)"
                        [class]="action.class"
                        (click)="action.type !== 'submit' && action.handler(form()!)">
                        {{ action.label }}
                    </button>
                }
            </div>
        </form>
    `
})
export class DynamicFormComponent {
    @Input({ required: true }) schema!: FormSchema;
    @Input() initialData?: any;
    @Input() actions: FormAction[] = [];  // Configurable actions
    @Output() formReady = new EventEmitter<FormGroup>();

    form = signal<FormGroup | null>(null);

    ngOnInit() {
        const compiled = this.resolver.resolve(this.schema);
        const formGroup = this.formGenerator.toFormGroup(compiled);

        if (this.initialData) {
            this.formGenerator.patchForm(formGroup, this.initialData, compiled);
        }

        this.form.set(formGroup);
        this.formReady.emit(formGroup);
    }

    onSubmit() {
        const submitAction = this.actions.find(a => a.type === 'submit');
        if (submitAction) {
            submitAction.handler(this.form()!);
        }
    }
}

// Parent Component Usage
export class FormAdminControlComponent {
    formActions: FormAction[] = [
        {
            label: 'Save',
            type: 'submit',
            disabled: (form) => form.invalid,
            handler: (form) => this.onSave(form),
            class: 'btn-primary'
        },
        {
            label: 'Reset',
            type: 'reset',
            handler: (form) => form.reset(),
            class: 'btn-secondary'
        },
        {
            label: 'Debug',
            handler: (form) => console.log(form.value)
        }
    ];

    onSave(form: FormGroup) {
        this.http.post('/api/save', form.value).subscribe();
    }
}

// Template
<app-dynamic-form
    [schema]="schema"
    [initialData]="initialValues"
    [actions]="formActions"
    (formReady)="form = $event">
</app-dynamic-form>
```

#### Pros

-   ✅ **Highly reusable** - one component for all use cases
-   ✅ **Declarative configuration** - actions defined in parent
-   ✅ **Encapsulation maintained** - form creation still internal
-   ✅ **Flexible actions** - any number of buttons with custom logic
-   ✅ **Type-safe callbacks** - FormGroup passed to handlers
-   ✅ **No boilerplate** - parent doesn't create form manually

#### Cons

-   ❌ **More complex component** - handles rendering + actions
-   ❌ **Potential over-engineering** - may be overkill for simple cases
-   ❌ **Styling constraints** - action button layout must be generic
-   ❌ **Still indirect access** - parent needs `formReady` for advanced scenarios

---

### Option 4: Hybrid Approach (External Form + Generic Actions)

**Approach:** Combine Options 1 and 3 - allow both external form creation and configurable actions.

#### Implementation

```typescript
@Component({
    selector: 'app-dynamic-form'
})
export class DynamicFormComponent {
    // Option A: Pass form and schema (external creation)
    @Input() form?: FormGroup;
    @Input() schema?: FormSchema;

    // Option B: Pass raw schema (internal creation)
    @Input() rawSchema?: FormSchema;
    @Input() initialData?: any;

    // Always configurable
    @Input() actions: FormAction[] = [];
    @Output() formReady = new EventEmitter<FormGroup>();

    internalForm = signal<FormGroup | null>(null);

    ngOnInit() {
        if (this.form && this.schema) {
            // External form provided - use it
            this.internalForm.set(this.form);
            this.formReady.emit(this.form);
        } else if (this.rawSchema) {
            // Create form internally
            const compiled = this.resolver.resolve(this.rawSchema);
            const formGroup = this.formGenerator.toFormGroup(compiled);

            if (this.initialData) {
                this.formGenerator.patchForm(formGroup, this.initialData, compiled);
            }

            this.internalForm.set(formGroup);
            this.formReady.emit(formGroup);
        }
    }
}

// Usage 1: Simple (internal creation)
<app-dynamic-form [rawSchema]="schema" [actions]="actions">
</app-dynamic-form>

// Usage 2: Advanced (external creation)
<app-dynamic-form [form]="myForm" [schema]="compiledSchema" [actions]="actions">
</app-dynamic-form>
```

#### Pros

-   ✅ **Maximum flexibility** - supports both patterns
-   ✅ **Progressive enhancement** - simple cases easy, complex cases supported
-   ✅ **Backward compatible** - can migrate gradually
-   ✅ **Best of both worlds** - encapsulation + control

#### Cons

-   ❌ **Most complex implementation** - two creation paths
-   ❌ **API confusion** - developers must choose which pattern
-   ❌ **Maintenance burden** - more code to maintain

---

## Recommendation

### 🎯 **Recommended: Option 3 (Generic Form with Actions)**

**Rationale:**

1. **Addresses the core problem** - Parent gets form access via `formReady` event
2. **Maintains encapsulation** - Form creation stays internal (follows Angular patterns)
3. **Highly reusable** - One component for all scenarios (demo, admin, etc.)
4. **Declarative API** - Actions are clean and type-safe
5. **Scales well** - Can add more features (validations, dirty tracking) without breaking changes
6. **Angular-idiomatic** - Uses inputs/outputs as intended

### Implementation Plan

1. **Update `DynamicFormComponent`**

    - Add `@Input() actions: FormAction[]`
    - Add `@Output() formReady: EventEmitter<FormGroup>`
    - Render action buttons from config
    - Emit form on creation

2. **Create `FormAction` interface** in `form-schema.interface.ts`

3. **Update consuming components**

    - `FormAdminControlComponent` - define save/reset actions
    - `DemoAppComponent` - define submit/debug actions

4. **Add action styling** - generic button styles in component

### Future Enhancements (Post-MVP)

-   **Form state management** - track dirty, touched, pristine
-   **Conditional actions** - show/hide based on form state
-   **Action placement** - configure location (top, bottom, side)
-   **Loading states** - disable actions during async operations
-   **Confirmation dialogs** - before destructive actions
-   **Keyboard shortcuts** - Ctrl+S for save, etc.

---

## Alternative for Specific Needs

If you still need **direct form access** for complex scenarios (like multi-step forms, form arrays manipulation), consider:

### ViewChild/ContentChild Approach

```typescript
// DynamicFormComponent exposes form via public property
export class DynamicFormComponent {
    public form = signal<FormGroup | null>(null);
}

// Parent uses ViewChild
export class FormAdminControlComponent {
    @ViewChild(DynamicFormComponent) formComponent!: DynamicFormComponent;

    onSave() {
        const form = this.formComponent.form();
        this.http.post('/api/save', form?.value).subscribe();
    }
}
```

This is **not recommended** as primary approach but useful for edge cases.

---

## Decision Log

| Date       | Decision         | Reason                             |
| ---------- | ---------------- | ---------------------------------- |
| 2026-01-10 | Document created | Evaluate form architecture options |
| TBD        | Final decision   | After team discussion              |

---

## Questions for Discussion

1. Do we need to support **external form creation** for advanced use cases?
2. Should action buttons be **always visible** or configurable to hide?
3. Do we need **form-level events** (onDirty, onValidate, etc.)?
4. Should we support **multiple action groups** (header + footer)?
5. How do we handle **async form submission** (loading states)?

---

## Related Documents

-   [controls.md](./controls.md) - Control types and configuration
-   [design.md](./design.md) - Overall architecture
-   [simplified-architecture.md](./simplified-architecture.md) - Current form architecture
