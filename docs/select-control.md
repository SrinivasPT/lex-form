# Select Control — Technical Specification

This document describes the current implementation and intended behavior for the `select` control used by the Generic Form Builder.

Summary of current repo state:

-   The `ControlDefinition` interface provides `domainConfig` (categoryCode, dependentOn, cacheTtl) for select data, but does NOT include a static `options` array or a `multiple` property yet.
-   A centralized Domain data provider exists as `DomainData` (`src/app/core/services/domain-data.service.ts`) but is not implemented.
-   The `SelectControlComponent` is not yet implemented; `DynamicControlComponent` contains a placeholder rendering for `select`.

---

## 1. Schema Configuration (Contract)

The schema for a select control is defined by the `ControlDefinition` in `src/app/core/models/form-schema.interface.ts`.

Key properties relevant to Select controls:

-   `key`: string — The bound property name for the control (e.g., `countryId`)
-   `type`: `'select'` — Identifies the control type
-   `label`, `placeholder`, `width`, `validators`, etc.
-   `domainConfig`?: { `categoryCode`: string; `dependentOn`?: string; `cacheTtl`?: number }
    -   `categoryCode`: business lookup key for the domain (e.g., `COUNTRY`, `STATE`)
    -   `dependentOn`: optional — key of the parent control used to query dependent lists
    -   `cacheTtl`: optional — time in seconds to consider cached data valid; default behavior currently unspecified (recommendation: session cache)

Notes:

-   The current interface does not include an `options` property for static option arrays. If you require static (hard-coded) select options, consider extending `ControlDefinition` with an `options` field or continue to encode these values in the global `control-library` as pre-defined controls.
-   `multiple` selection is not implemented by the `ControlDefinition` (no `multiple` boolean present).

---

## 2. Functional Behavior & Modes

Given the current code, the following operation modes are supported conceptually:

### 2.1. Dynamic Domain Mode (primary)

-   The control uses `domainConfig.categoryCode` to fetch values from the centralized domain service.
-   If `dependentOn` is provided, the control subscribes to the parent form control's value and refetches when the parent changes.
-   The control should delay fetching until initialization and when the parent provides a value (lazy load).

### 2.2. Static Options Mode (not implemented in schema)

-   Static options are not currently supported as a built-in property on `ControlDefinition`.
-   If desired, add `options?: { label: string; value: any }[]` to `ControlDefinition` and use it as precedence over `domainConfig`.

### 2.3. Cascading / Dependent Mode

-   Parent value is null/undefined: Child options should be empty and preferably the child control disabled.
-   Parent value changes: clear current child selection, show loading state, and call the domain data service for the new list.
-   Rapid parent changes: new calls should cancel previous requests (use RxJS `switchMap`).

---

## 3. Domain Data Handling (DomainData service)

The repository contains `src/app/core/services/domain-data.service.ts` with an injectable named `DomainData`. The service needs to implement these behaviors:

-   Method signature (recommended):

```ts
getDomainValues(categoryCode: string, parentValue?: any): Observable<DomainValue[]>
```

-   Caching behavior:
    -   Global cache (categoryCode) e.g., `COUNTRY`
    -   Contextual cache (categoryCode + parentValue) for dependent lists e.g., `STATE|countryId`
    -   Use an in-memory map with `shareReplay(1)` on the underlying HTTP observable for each cache key
-   Cancellation/Concurrency handling:
    -   For dependent requests triggered by parent changes, callers should use `switchMap` to ensure only the latest value is applied

Recommended `DomainValue` interface (not yet in codebase):

```ts
interface DomainValue {
    code: string | number;
    displayText: string;
    extension?: any; // e.g., currency, region metadata, etc.
}
```

> Note: You may want to add a `toDomainValue` adapter to the service to convert server responses into this canonical form.

---

## 4. UI / Component Expectations

The `SelectControlComponent` (standalone) is not yet implemented; the `DynamicControlComponent` currently renders a placeholder for `select`. The following expectations should guide implementation:

-   The `SelectControlComponent` should be a standalone Angular component and accept `config: ControlDefinition` and `group: FormGroup` as inputs.
-   Expose the domain values as an Angular `Signal<DomainValue[]>` or `ReadonlySignal<DomainValue[]>` for template usage to leverage signal-based updates.
-   Internally use `DomainData` service to fetch lists. If the control is dependent, subscribe to `formGroup.get(parentKey).valueChanges` and `switchMap` to service calls.
-   When `domainConfig` is provided and value is being fetched, set `aria-busy="true"` and show a loading option or spinner.
-   If there are no results, render a `-- No items found --` option.
-   If the parent is not defined but `dependentOn` is configured, disable the control until parent provides a value.
-   Use `FormControlName` within the component to bind selection to the current `group` and `config.key`.

Accessibility (A11y):

-   Link `<label>` `for` attribute to the `select` id
-   Use `aria-busy` during fetch and `aria-disabled` when waiting for a parent
-   Allow keyboard navigation, prefer native `<select>` for best browser support

---

## 5. Template Example (recommended)

This is a minimal template pattern intended for the `SelectControlComponent`:

```html
<label [for]="selectId">{{ config.label }}</label>
<select [id]="selectId" [formControlName]="config.key" [disabled]="isDisabled()">
    <option value="" disabled *ngIf="loading">Loading...</option>
    <option value="" disabled *ngIf="!loading && values.length === 0">No items found</option>
    <option *ngFor="let v of valuesSignal()" [value]="v.code">{{ v.displayText }}</option>
</select>
```

-   `valuesSignal()` indicates a signal-based access pattern. Alternatively use Observable + `| async` if preferred.

---

## 6. Error Handling & UX States

-   Loading: show a disabled option or spinner
-   Empty: show an informational option
-   Parent required: disable child, show `aria-disabled`
-   Network/Error: show an error toast or an option like `Failed to fetch` (but don’t crash the entire form)

---

## 7. Implementation Checklist (aligned to code state)

-   [x] Interface: `ControlDefinition` already includes `domainConfig` with `categoryCode`, `dependentOn`, and `cacheTtl`.
-   [ ] Service: Implement `DomainData` in `src/app/core/services/domain-data.service.ts` with caching and `getDomainValues`.
-   [ ] Component: Implement `SelectControlComponent` as a standalone component and add it to `DynamicControlComponent` imports.
-   [ ] Dynamic Control: Replace placeholder select case in `DynamicControlComponent` template with the `SelectControlComponent` host.
-   [ ] (Optional) Schema: Add `options?: DomainValue[]` to `ControlDefinition` if you want static mode support.
-   [ ] Tests: Add unit tests for `DomainData` (caching, context cache), `SelectControlComponent` (modes, dependent behavior, A11y).

---

## 8. Next Steps & Suggestions

-   Implement `DomainData` and wire it up with a minimal HTTP adapter for local testing (or mock in tests).
-   Build `SelectControlComponent` using the Signal pattern or Observables as per your app’s preference.
-   If you need static select options or `multiple` selection, extend `ControlDefinition` and update `control-library` entries accordingly.

If you’d like, I can implement a starting `SelectControlComponent` and `DomainData` skeleton next. Which would you prefer: `Signals`-based implementation or Observable + `async` pipe?
