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

            // Recursively resolve children for group/table controls
            if (merged.controls) {
                merged.controls = merged.controls.map((c) => this.resolveControl(c));
            }
            return merged;
        }

        // It's a purely custom control not in the library
        // Recursively resolve children if present
        if (config.controls) {
            config.controls = config.controls.map((c) => this.resolveControl(c));
        }

        return config;
    }

    private createFallback(key: string): ControlDefinition {
        return { key, type: 'text', label: `[${key}]` };
    }
}
