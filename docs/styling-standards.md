# Styling Standards & Utilities

## Overview

This project follows a **centralized styling approach** for consistency, maintainability, and standardization. Inline styles should be avoided unless absolutely necessary (e.g., dynamic values from data).

## Style Architecture

### Central Style Files

All centralized styles are located in `projects/form-lib/src/lib/styles/`:

-   **`variables.scss`** - SCSS variables for design tokens (colors, spacing, typography)
-   **`mixins.scss`** - Reusable SCSS mixins for common patterns
-   **`theme.scss`** - CSS custom properties (CSS variables) for runtime theming
-   **`utilities.scss`** - Utility classes for common styling needs (NEW)
-   **`index.scss`** - Main entry point that imports all style files

### Usage in Your App

```scss
// In your main styles.scss
@use '@form-lib/styles' as *;
```

This imports all utilities, theme variables, and base styles.

## Utility Classes

### Layout & Container

```html
<!-- App container with font family -->
<div class="app-container">...</div>

<!-- Content with padding -->
<div class="content-container">...</div>

<!-- Section spacing -->
<div class="section-container">...</div>
```

### Navigation

```html
<nav class="app-nav">
    <h3 class="app-nav-title">Title</h3>
    <a routerLink="/path" class="app-nav-link">Link</a>
</nav>
```

### Spacing Utilities

#### Margin

```html
<div class="mt-0">...</div>
<!-- margin-top: 0 -->
<div class="mt-1">...</div>
<!-- margin-top: 8px (sm) -->
<div class="mt-2">...</div>
<!-- margin-top: 12px (default) -->
<div class="mt-3">...</div>
<!-- margin-top: 16px (lg) -->
<div class="mt-4">...</div>
<!-- margin-top: 20px -->

<!-- Same pattern for: mb (bottom), ml (left), mr (right) -->
```

#### Padding

```html
<div class="p-0">...</div>
<!-- padding: 0 -->
<div class="p-1">...</div>
<!-- padding: 6px (sm) -->
<div class="p-2">...</div>
<!-- padding: 10px (default) -->
<div class="p-3">...</div>
<!-- padding: 15px (lg) -->
<div class="p-4">...</div>
<!-- padding: 20px -->

<!-- Same pattern for: pt, pb, pl, pr -->
```

#### Specific Spacing

```html
<div class="padding-10">...</div>
<!-- 10px padding -->
<div class="padding-20">...</div>
<!-- 20px padding -->
<div class="margin-top-20">...</div>
<!-- 20px top margin -->
```

### Flexbox

```html
<div class="d-flex">
    <div>Item 1</div>
    <div>Item 2</div>
</div>

<div class="d-flex align-items-center gap">...</div>
<div class="d-flex justify-content-between">...</div>
<div class="d-flex flex-column gap-lg">...</div>
```

**Available Classes:**

-   `d-flex` - Display flex
-   `flex-column` - Flex direction column
-   `align-items-center` - Align items center
-   `justify-content-center` - Justify content center
-   `justify-content-between` - Justify content space-between
-   `gap` - 12px gap
-   `gap-sm` - 8px gap
-   `gap-lg` - 16px gap
-   `gap-20` - 20px gap

### Typography

```html
<div class="font-sans">...</div>
<div class="text-center">...</div>
<div class="font-weight-bold">...</div>
```

**Available Classes:**

-   `font-sans` - System font family
-   `text-center`, `text-left`, `text-right`
-   `font-weight-normal`, `font-weight-medium`, `font-weight-bold`

### Display

```html
<div class="d-block">...</div>
<div class="d-none">...</div>
<div class="d-inline-block">...</div>

<!-- For tree/accordion expansion -->
<div class="collapsed">...</div>
<div class="expanded">...</div>
```

### Colors

```html
<!-- Text colors -->
<span class="text-primary">Primary text</span>
<span class="text-danger">Error text</span>
<span class="text-success">Success text</span>
<span class="text-muted">Muted text</span>
<span class="text-white">White text</span>

<!-- Background colors -->
<div class="bg-primary">...</div>
<div class="bg-alt">...</div>
<div class="bg-white">...</div>
```

### Width & Sizing

```html
<div class="w-100">...</div>
<!-- width: 100% -->
<div class="w-auto">...</div>
<!-- width: auto -->
```

### Borders

```html
<div class="border border-radius">...</div>
```

### Code Blocks

```html
<pre class="code-block">{{ jsonData }}</pre>
```

## When to Use Inline Styles

✅ **ACCEPTABLE** use cases:

-   Dynamic values from data: `[style.width.px]="dynamicWidth"`
-   Calculated positions: `[style.left.px]="position"`
-   Conditional display with complex logic requiring multiple bindings

❌ **AVOID** inline styles for:

-   Static values (padding, margin, colors)
-   Common patterns (flexbox, typography)
-   Anything that can be expressed with a utility class

## Migration Guide

### Before (Inline Styles)

```html
<div style="padding: 20px; font-family: sans-serif;">
    <nav style="background: #333; color: white; padding: 10px 20px; display: flex; gap: 20px;">
        <h3 style="margin: 0;">Title</h3>
    </nav>
</div>
```

### After (Utility Classes)

```html
<div class="content-container">
    <nav class="app-nav">
        <h3 class="app-nav-title">Title</h3>
    </nav>
</div>
```

## Design Tokens

Access design tokens via:

### SCSS Variables

```scss
@use 'form-lib/styles/variables' as *;

.my-component {
    padding: $form-padding;
    color: $form-text-color;
    border: $form-border-width solid $form-border-color;
}
```

### CSS Variables (Runtime)

```css
.my-component {
    padding: var(--form-padding);
    color: var(--form-text-color);
    border: var(--form-border-width) solid var(--form-border-color);
}
```

## Adding New Utilities

If you need a new utility class:

1. Check if it fits an existing pattern
2. Add it to `utilities.scss` with proper naming
3. Document it in this file
4. Use design tokens from `variables.scss`

**Example:**

```scss
// utilities.scss
.my-new-utility {
    padding: $form-padding-lg;
    border-radius: $form-border-radius;
}
```

## Benefits

✅ **Consistency** - All components use the same spacing, colors, and patterns
✅ **Maintainability** - Change once in the central file, applies everywhere
✅ **Performance** - Utility classes are cached by the browser
✅ **Readability** - Semantic class names are clearer than inline styles
✅ **Theming** - Easy to implement dark mode or custom themes
✅ **Type Safety** - No typos in class names (IDE autocomplete)
