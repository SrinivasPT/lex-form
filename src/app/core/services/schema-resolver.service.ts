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
            sections: schema.sections.map((section) => this.resolveSection(section)),
        };
    }

    private resolveSection(section: FormSection): FormSection {
        return {
            ...section,
            // Recursively resolve all controls in this section
            controls: section.controls.map((c) => this.resolveControl(c)),
        };
    }

    /**
     * The Core Logic: String lookup vs. Object Merge
     */
    private resolveControl(config: ControlConfig): ControlDefinition {
        if (typeof config === 'string') {
            return { ...(GLOBAL_CONTROL_LIBRARY[config] || this.createFallback(config)) };
        }

        // It is an object. Check if the 'key' matches a Library Definition.
        const libraryDef = GLOBAL_CONTROL_LIBRARY[config.key];

        if (libraryDef) {
            // MERGE: Library Base + Config Overrides
            // Config wins (Right side of spread)
            const merged = { ...libraryDef, ...config };

            // Special handling: If type is table, we still need to recurse
            if (merged.type === 'table' && merged.rowConfig) {
                merged.rowConfig = merged.rowConfig.map((c) => this.resolveControl(c));
            }
            return merged;
        }

        // It's a purely custom control not in the library
        if (config.type === 'table' && config.rowConfig) {
            config.rowConfig = config.rowConfig.map((c) => this.resolveControl(c));
        }

        return config;
    }

    private createFallback(key: string): ControlDefinition {
        return { key, type: 'text', label: `[${key}]` };
    }
}
