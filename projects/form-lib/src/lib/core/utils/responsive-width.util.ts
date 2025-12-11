/**
 * Utility for handling responsive widths using a 12-point grid scale.
 * Convention: [Mobile, Tablet, Desktop]
 * - Index 0: Mobile (xs / default)
 * - Index 1: Tablet (md)
 * - Index 2: Desktop (lg)
 *
 * Rules:
 * - If only 1 value defined: all breakpoints use the same value
 * - If 2 values defined: [mobile/tablet, desktop] - first value for mobile & tablet, second for desktop
 * - If 3 values defined: [mobile, tablet, desktop] - explicit values for each breakpoint
 */

export interface ResponsiveWidth {
    mobile: number; // xs breakpoint (default)
    tablet: number; // md breakpoint
    desktop: number; // lg breakpoint
}

/**
 * Parses width configuration and returns responsive width values
 * @param width - Single number, array [mobile, tablet, desktop], or string like "[12]"
 * @returns ResponsiveWidth object with values for each breakpoint
 */
export function parseResponsiveWidth(width?: number | number[] | string): ResponsiveWidth {
    // Default to full width (12 columns) if not specified
    if (width === undefined || width === null) {
        return { mobile: 12, tablet: 12, desktop: 12 };
    }

    // Handle string notation like "[12]" or "[12, 6, 4]"
    if (typeof width === 'string') {
        try {
            const parsed = JSON.parse(width);
            if (Array.isArray(parsed)) {
                return parseResponsiveWidth(parsed);
            } else if (typeof parsed === 'number') {
                return parseResponsiveWidth(parsed);
            }
        } catch {
            // If parsing fails, return default
            return { mobile: 12, tablet: 12, desktop: 12 };
        }
    }

    // Single value - apply to all breakpoints
    if (typeof width === 'number') {
        return { mobile: width, tablet: width, desktop: width };
    }

    // Array notation
    if (Array.isArray(width)) {
        const len = width.length;

        if (len === 0) {
            return { mobile: 12, tablet: 12, desktop: 12 };
        }

        if (len === 1) {
            // Only one value - use for all breakpoints
            return { mobile: width[0], tablet: width[0], desktop: width[0] };
        }

        if (len === 2) {
            // Two values - first for mobile & tablet, second for desktop
            return { mobile: width[0], tablet: width[0], desktop: width[1] };
        }

        // Three or more values - use first three explicitly
        return { mobile: width[0], tablet: width[1], desktop: width[2] };
    }

    // Fallback
    return { mobile: 12, tablet: 12, desktop: 12 };
}

/**
 * Generates CSS class names for responsive width based on 12-point grid
 * @param width - Single number, array [mobile, tablet, desktop], or string like "[12]"
 * @returns String of CSS classes for responsive grid
 */
export function getResponsiveWidthClasses(width?: number | number[] | string): string {
    const responsive = parseResponsiveWidth(width);

    return `col-xs-${responsive.mobile} col-md-${responsive.tablet} col-lg-${responsive.desktop}`;
}

/**
 * Generates inline style object for responsive width
 * Can be used with ngStyle directive
 * Note: Widths are calculated to work within a flex container with 16px gap
 * @param width - Single number, array [mobile, tablet, desktop], or string like "[12]"
 * @returns Object with CSS custom properties for width
 */
export function getResponsiveWidthStyle(
    width?: number | number[] | string
): Record<string, string> {
    const responsive = parseResponsiveWidth(width);

    // Calculate width accounting for flex gap (16px)
    // For items that should span full width (12 cols), use 100%
    // For smaller widths, calculate percentage and subtract gap proportionally
    const calculateWidth = (cols: number): string => {
        const percentage = (cols / 12) * 100;
        if (cols === 12) {
            return '100%';
        }
        // Subtract gap proportionally: for 6 cols (50%), subtract 8px, etc.
        return `calc(${percentage}% - ${(16 * (12 - cols)) / 12}px)`;
    };

    return {
        '--width-xs': calculateWidth(responsive.mobile),
        '--width-md': calculateWidth(responsive.tablet),
        '--width-lg': calculateWidth(responsive.desktop),
    };
}

export function getResponsiveGridVars(width?: number | number[] | string): Record<string, string> {
    const responsive = parseResponsiveWidth(width);
    return {
        '--col-span-xs': String(responsive.mobile),
        '--col-span-md': String(responsive.tablet),
        '--col-span-lg': String(responsive.desktop),
    };
}
