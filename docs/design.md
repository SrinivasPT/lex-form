# Generic Form Builder Framework - Technical Requirements

Consolidated technical requirements for a metadata-driven form engine based on architectural discussions.

---

## 1. High-Level Objectives

**Goal:** Build a metadata-driven engine capable of rendering complex, nested, and dynamic forms from JSON configurations.

**Target Framework:** Angular 18+ (Latest Stable)

**Core Principles:**

-   **Metadata Driven:** 100% of the UI and behavior is defined in JSON
-   **Separation of Concerns:** Data Definition (Dictionary) is separate from Layout (Form Config)
-   **Performance:** Strict usage of OnPush change detection and Angular Signals

---

## 2. Schema Architecture (The "Contract")

### 2.1. The Dictionary Strategy (Global Library)

The framework must support a central **Control Registry (Dictionary)**.

This registry defines the "Base Truth" for data entities (e.g., `employee.email` always has specific validators and labels).

### 2.2. The Form Definition (Context)

The Form JSON must support a **Merge Strategy** for controls:

-   **Lookup:** A control can be defined as a simple string key (e.g., `"employee.email"`), which triggers a lookup in the Dictionary
-   **Override:** A control can be defined as an object. If the key exists in the Dictionary, the object properties (Label, Disabled state) override the dictionary defaults

### 2.3. Recursive Structure

The schema is hierarchical: **Form → Sections → Controls**

Controls can contain other controls (e.g., a "Table" control contains a `rowConfig` array of controls).

---

## 3. Data Binding & Scoping

### 3.1. Hierarchical Data Binding

The system must support **Relative Binding** based on the DOM/Component structure:

-   **Root:** The top-level form binds to the entire Entity Object
-   **Section Scoping:** A Section can optionally define a `key`. If present, it creates a nested FormGroup for that key (e.g., a section with key `address` binds all child inputs to `model.address.*`)
-   **Table Scoping:** A Table Row creates a temporary local scope. Controls inside the row bind to that specific array item

### 3.2. Form State

-   Must use Angular `ReactiveFormsModule` (FormGroup, FormArray, FormControl)
-   The output must be a clean JSON object matching the API entity structure

---

## 4. Layout & Visual Requirements

### 4.1. Section Layouts

Sections act as visual containers (Panels/Cards).

**Grid System:** Sections must support a `width` property using a **12-point grid scale**. It accepts a single number (applied to all breakpoints) or an array `[Mobile, Tablet, Desktop]` (e.g., `6` or `[12, 6, 4]`).

### 4.2. Control Types

The engine must support a **plugin-style architecture** to render different components based on type:

**Atomic:**

-   Input (Text/Number)
-   Date
-   Checkbox
-   Select

**Composite:**

-   **Group:** A logical container for nested data without visual section borders
-   **Table (Array):** A generic grid where columns are defined as a list of controls. Must support Add/Remove row actions

---

## 5. Validation & Logic Engine

### 5.1. Validation

-   **Static:** Support standard Angular validators (`required`, `min`, `max`, `pattern`, `email`)
-   **Custom:** Support defining custom validators via the dictionary

### 5.2. Expression Evaluation (The "Brain")

The framework must include a safe **Expression Parser** to evaluate strings at runtime.

**Triggers:**

-   `visibleWhen`: Toggles element presence (DOM removal vs CSS hiding)
-   `disabledWhen`: Toggles FormControl status (Enabled/Disabled)
-   `requiredWhen`: Dynamically adds/removes the Required validator

### 5.3. Context Awareness

Expressions must be able to distinguish between **Global Scope** and **Local Scope**:

-   **Global:** `model.role == 'Admin'` (Checks root data)
-   **Local (Row):** `row.amount > 500` (Checks current table row data)

---

## 6. Master Data & Dynamic Sources

### 6.1. Domain-Driven Selects

Controls (specifically Select/Autocomplete) must support a `domainConfig` object.

Instead of hardcoding options in JSON, the control references a `categoryCode` (e.g., `"COUNTRY"`). It also supports `cacheTtl` for defining cache duration.

### 6.2. Centralized Service

A `DomainDataService` will intercept these requests.

It must handle **Caching** (fetching the list of Countries only once per session).

### 6.3. Cascading/Dependent Dropdowns

Controls must support a `dependentOn` property.

**Logic:**

1. Watch the Parent Control (defined by `dependentOn`) for value changes
2. If Parent changes, query the `DomainDataService` with the new Parent Value
3. Service filters the child list (e.g., Show Cities where `parentCode = Selected State`)

---

## 7. Technical Implementation Constraints

-   **Standalone Components:** No usage of NgModule. All UI parts must be Standalone Components
-   **Signals:** Use Angular Signals for managing UI state (e.g., list of options in a dropdown, visibility status) to ensure performance
-   **Change Detection:** `ChangeDetectionStrategy.OnPush` must be enforced on all components to prevent rendering bottlenecks in large forms
-   **Extensibility:** The ControlResolver must be designed so that new Control Types can be added without rewriting the core engine

---

## 8. Summary JSON Snippet (For Clarity)

The final architecture will process a generic configuration resembling this:

```json
{
    "code": "employee_onboarding",
    "sections": [
        {
            "label": "Personal Details",
            "width": 6,
            "controls": ["employee.firstName", "employee.lastName"]
        },
        {
            "label": "Address",
            "width": 12,
            "key": "address",
            "controls": [
                {
                    "key": "stateId",
                    "type": "select",
                    "domainConfig": { "categoryCode": "STATE" }
                },
                {
                    "key": "cityId",
                    "type": "select",
                    "domainConfig": { "categoryCode": "CITY", "dependentOn": "stateId" }
                }
            ]
        },
        {
            "label": "Dependents",
            "type": "table",
            "key": "dependents",
            "rowConfig": ["employee.name", "employee.relation", "employee.dob"]
        }
    ]
}
```
