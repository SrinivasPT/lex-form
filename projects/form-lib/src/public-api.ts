/*
 * Public API Surface of form-lib
 */

export * from './lib/form-lib';
export type {
    FormSchema,
    ControlDefinition,
    FormAction,
} from './lib/core/models/form-schema.interface';
export type {
    FormContent,
    FormContentState,
    FormContentSignals,
    FormMetadata,
    TreeNode,
    DomainDataItem,
} from './lib/core/models/form-content.interface';
export { DynamicFormComponent } from './lib/shared/components/dynamic-form/dynamic-form.component';
export { GenericFormComponent } from './lib/shared/components/generic-form/generic-form.component';
export type { GenericFormConfig } from './lib/shared/components/generic-form/generic-form.component';
export { TreeControlComponent } from './lib/shared/components/controls/tree-control.component';
export { AlertComponent } from './lib/shared/components/alert/alert.component';
export { SpinnerComponent } from './lib/shared/components/spinner/spinner.component';
export { FormHeaderComponent } from './lib/shared/components/form-header/form-header.component';
export { FormContentService } from './lib/core/services/form-content.service';
export { FormContentResolver } from './lib/core/resolvers/form-content.resolver';
