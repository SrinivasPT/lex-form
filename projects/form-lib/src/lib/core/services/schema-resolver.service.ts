import { Injectable } from '@angular/core';
import {
    FormSchema,
    FormSection,
    ControlDefinition,
    ControlConfig,
} from '../models/form-schema.interface';
import { GLOBAL_CONTROL_LIBRARY } from '../config/control-library';

@Injectable({
    providedIn: 'root',
})
export class SchemaResolverService {
    /**
     * Main Entry: Compiles the entire raw schema into a fully resolved schema.
     */
    resolve(schema: FormSchema): FormSchema {
        return {
            ...schema,
            sections: schema.sections.map((section) => this.resolveControl(section)),
        };
    }

    /**
     * The Core Logic: String lookup vs. Object Merge
     * Now handles all controls uniformly - sections, groups, tables, base controls
     */
    private resolveControl(config: ControlConfig): ControlDefinition {
        if (typeof config === 'string') {
            return { ...(GLOBAL_CONTROL_LIBRARY[config] || this.createFallback(config)) };
        }

        // It is an object. Check if the 'code' matches a Library Definition.
        const libraryDef = GLOBAL_CONTROL_LIBRARY[config.code as string];

        if (libraryDef) {
            // MERGE: Library Base + Config Overrides
            // Config wins (Right side of spread)
            const merged = { ...libraryDef, ...config };

            // Parse JSON string fields from database
            this.parseJsonFields(merged);

            // Recursively resolve children for group/table/tab_group controls
            if (merged.controls) {
                merged.controls = merged.controls.map((c) => this.resolveControl(c));
            }
            return merged;
        }

        // It's a purely custom control not in the library
        // Parse JSON string fields from database
        this.parseJsonFields(config);

        // Recursively resolve children if present
        if (config.controls) {
            config.controls = config.controls.map((c) => this.resolveControl(c));
        }

        return config;
    }

    /**
     * Parse JSON string fields from database into objects
     * Handles: additionalSettings, width, options, validators, etc.
     * Uses 'any' type to handle dynamic properties across different control types
     */
    private parseJsonFields(control: ControlDefinition): void {
        const ctrl = control as any;

        // Parse additionalSettings if it's a string (for table controls)
        if (typeof ctrl.additionalSettings === 'string') {
            try {
                ctrl.additionalSettings = JSON.parse(ctrl.additionalSettings);
            } catch (e) {
                console.error(
                    `Failed to parse additionalSettings for control ${control.code}:`,
                    ctrl.additionalSettings,
                    e
                );
                ctrl.additionalSettings = undefined;
            }
        }

        // Parse width if it's a JSON string like "[12, 6, 4]"
        if (typeof control.width === 'string' && control.width.startsWith('[')) {
            try {
                control.width = JSON.parse(control.width);
            } catch (e) {
                console.error(
                    `Failed to parse width for control ${control.code}:`,
                    control.width,
                    e
                );
            }
        }

        // Parse options if it's a string (less common, but possible)
        if (typeof control.options === 'string') {
            try {
                control.options = JSON.parse(control.options);
            } catch (e) {
                console.error(
                    `Failed to parse options for control ${control.code}:`,
                    control.options,
                    e
                );
            }
        }

        // Parse validators if it's a string
        if (typeof control.validators === 'string') {
            try {
                control.validators = JSON.parse(control.validators);
            } catch (e) {
                console.error(
                    `Failed to parse validators for control ${control.code}:`,
                    control.validators,
                    e
                );
            }
        }
    }

    private createFallback(key: string): ControlDefinition {
        return { key, type: 'text', label: `[${key}]` };
    }
}
