import { Injectable } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class ExpressionEvaluatorService {
    /**
     * Main Entry Point
     * @param expression The string logic (e.g., "model.age > 18 && model.active == true")
     * @param context The data object (e.g., { model: { age: 20, active: true } })
     */
    evaluate(expression: string | undefined, context: any): boolean {
        if (!expression) return true; // Default to visible/enabled if no logic exists

        try {
            // 1. Parse simple comparisons
            // NOTE: This is a simplified parser for the MVP.
            // For production, use a library like 'jsep' or a recursive descent parser.

            // Handle AND logic (&&) - Split into chunks
            const andParts = expression.split('&&');

            // All parts must be true
            return andParts.every((part) => this.evaluateSingleCondition(part.trim(), context));
        } catch (e) {
            console.warn(`[Expression Error] Could not evaluate: "${expression}"`, e);
            return false; // Fail safe
        }
    }

    private evaluateSingleCondition(condition: string, context: any): boolean {
        // 1. Identify the operator
        const operators = ['==', '!=', '>=', '<=', '>', '<'];
        let op = operators.find((o) => condition.includes(o));

        // If no operator (e.g., "model.isActive"), check truthiness
        if (!op) {
            const val = this.getValueFromPath(condition, context);
            return !!val;
        }

        // 2. Split: "model.age > 18" -> ["model.age", "18"]
        const [leftStr, rightStr] = condition.split(op).map((s) => s.trim());

        // 3. Resolve Values
        const leftVal = this.getValueFromPath(leftStr, context);
        const rightVal = this.parsePrimitive(rightStr);

        // 4. Compare
        switch (op) {
            case '==':
                return leftVal == rightVal;
            case '!=':
                return leftVal != rightVal;
            case '>':
                return leftVal > rightVal;
            case '<':
                return leftVal < rightVal;
            case '>=':
                return leftVal >= rightVal;
            case '<=':
                return leftVal <= rightVal;
            default:
                return false;
        }
    }

    /**
     * Safely extracts deep values: "model.address.city" -> 'New York'
     */
    private getValueFromPath(path: string, context: any): any {
        if (path === 'true') return true;
        if (path === 'false') return false;
        if (path === 'null') return null;
        if (!isNaN(Number(path))) return Number(path); // It's a raw number

        // Traverse: model -> address -> city
        return path.split('.').reduce((acc, part) => {
            return acc && acc[part] !== undefined ? acc[part] : null;
        }, context);
    }

    /**
     * Converts string "18" to number 18, "'admin'" to string "admin"
     */
    private parsePrimitive(value: string): any {
        if (value === 'true') return true;
        if (value === 'false') return false;
        if (value === 'null') return null;

        // Check for string literal (wrapped in quotes)
        if (value.startsWith("'") || value.startsWith('"')) {
            return value.slice(1, -1);
        }

        // Check for number
        if (!isNaN(Number(value))) return Number(value);

        return value;
    }
}
