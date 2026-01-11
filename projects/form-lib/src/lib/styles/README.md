# Form Library Styles

This directory contains the centralized styling system for the form library.

## Structure

```
styles/
├── _variables.scss   # SCSS variables (colors, spacing, typography)
├── _mixins.scss      # Reusable style patterns (buttons, inputs, grids)
├── _theme.scss       # CSS custom properties (can be overridden by consumers)
└── index.scss        # Public API - import this in your app
```

## Usage for Library Consumers

### Basic Usage

Import the theme in your application's global styles:

```scss
// src/styles.scss
@import '@your-org/form-lib/styles';
```

This will include CSS custom properties that provide default theming.

### Advanced Usage - Custom Theming

Override CSS custom properties to customize the theme:

```scss
// src/styles.scss
@import '@your-org/form-lib/styles';

// Override theme colors
:root {
    --form-primary-color: #0056b3;
    --form-border-radius: 8px;
    --form-gap: 16px;
}
```

### Using SCSS Variables and Mixins

For custom components that need to match the library's styling:

```scss
// your-component.scss
@import '@your-org/form-lib/styles/variables';
@import '@your-org/form-lib/styles/mixins';

.my-custom-control {
    @include input-base;
    // Your additional styles
}

.my-button {
    @include button-primary;
}
```

## Usage for Library Developers

When creating new components, import variables and mixins:

```scss
// component.scss
@import '../../styles/variables';
@import '../../styles/mixins';

.my-component {
    padding: $form-padding;
    border-radius: $form-border-radius;

    .button {
        @include button-primary;
    }
}
```

## Available Variables

See [\_variables.scss](./_variables.scss) for the complete list. Key variables include:

-   **Colors**: `$form-primary-color`, `$form-error-color`, etc.
-   **Spacing**: `$form-gap`, `$form-padding`, etc.
-   **Typography**: `$form-font-size`, `$form-font-family`, etc.
-   **Borders**: `$form-border-radius`, `$form-border-color`, etc.

## Available Mixins

See [\_mixins.scss](./_mixins.scss) for the complete list. Key mixins include:

-   **Layout**: `@include grid-12-layout`, `@include flex-center`
-   **Controls**: `@include input-base`, `@include label-base`
-   **Buttons**: `@include button-primary`, `@include button-secondary`
-   **Containers**: `@include card-base`, `@include fieldset-base`
-   **Utilities**: `@include text-truncate`, `@include custom-scrollbar`

## CSS Custom Properties

All theme values are exposed as CSS custom properties (see [\_theme.scss](./_theme.scss)).
This allows runtime theming and easy customization by library consumers.

Example properties:

-   `--form-primary-color`
-   `--form-border-radius`
-   `--form-gap`
-   `--table-header-bg`
-   `--tree-node-hover-bg`

## Design Principles

1. **Component Encapsulation**: Each component's styles are scoped using `:host` and component selectors
2. **Theming Support**: Use CSS custom properties for values that consumers might want to customize
3. **Maintainability**: DRY principle - shared patterns are defined once in mixins
4. **Consistency**: All components use the same design tokens (colors, spacing, typography)
5. **Flexibility**: Library consumers can override theme without modifying library code
