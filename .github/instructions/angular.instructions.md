---
applyTo: 'src/**/*.{ts,html,scss}'
---

# Angular (Frontend) Conventions

-   Use Angular CLI & follow official Angular styleguide (file casing, modules, services).
-   Filenames: kebab-case (e.g., `employee-list.component.ts`); classes: PascalCase (e.g., `EmployeeListComponent`).
-   Selectors: `app-<component-name>`; keep them short and consistent.
-   Prefer components for UI, services for logic/HTTP and reactive forms for forms.
-   Keep shared controls/components in `src/app/shared/` and core services in `src/app/core/`.

## Form Generation

-   Use dynamic forms for schema-driven UI (see `dynamic-form.component.ts`, `form-generator.service.ts`).
-   Bind controls via `form-schema.interface.ts` and render with `dynamic-control.component.ts`.
-   Handle responsive width with `responsive-width.util.ts`.

## Core and Shared Folders

-   `src/app/core/`: Core services and utilities for form building (e.g., `form-generator.service.ts`, `schema-resolver.service.ts`, `domain-data.service.ts`). Always refer to and update these when modifying form logic or data handling.
-   `src/app/shared/`: Reusable components for form controls and UI (e.g., `dynamic-form.component.ts`, `table-control.component.ts`, `input-control.component.ts`). Refer to these for shared elements; ensure changes maintain reusability.

When touching code in these folders, review related files to ensure consistency and avoid breaking form builder functionality.
