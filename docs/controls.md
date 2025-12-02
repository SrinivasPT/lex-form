# Thoughts on Controls

## Controls Definition

-   Each table column will ultimately be displayed as a control on the UI. Treat each table column as a control.
-   Define the UI properties such as:
    -   **Label**: The display name for the control.
    -   **Key**: Derived from the table column name.
    -   **Type of Control**: Can be inferred (e.g., columns ending with "code" typically represent a select control, "date" columns represent a date control, etc.).
-   Assign a default width for the control based on the nature of the data it captures.
-   All domain data will be stored in the `domain` or `code_value` table.

## Section Definition

-   A table might correspond to a section, but deviations are possible. Carefully evaluate each case.
-   Associate the controls defined above with their respective sections.

## Form Definition

-   Forms are composed of sections.
-   Each section will include the associated controls.
