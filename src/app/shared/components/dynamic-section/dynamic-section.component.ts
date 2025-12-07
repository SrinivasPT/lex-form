// import { Component, Input, OnInit, HostBinding } from '@angular/core';
// import { CommonModule } from '@angular/common';
// import { ReactiveFormsModule, FormGroup, FormGroupDirective } from '@angular/forms';
// import { FormSection, ControlDefinition } from '../../../core/models/form-schema.interface';
// import { DynamicControlComponent } from '../dynamic-control/dynamic-control.component';
// import {
//     getResponsiveWidthStyle,
//     getResponsiveGridVars,
// } from '../../../core/utils/responsive-width.util';

// @Component({
//     selector: 'app-dynamic-section',
//     standalone: true,
//     imports: [CommonModule, ReactiveFormsModule, DynamicControlComponent],
//     host: { class: 'responsive-col' },
//     template: `
//         <div class="section-card">
//             <fieldset class="section-fieldset">
//                 @if (config.label) {
//                 <legend>{{ config.label }}</legend>
//                 }

//                 <!-- Pass root form to all controls for dataPath resolution -->
//                 @for (control of resolvedControls; track control.key) {
//                 <app-dynamic-control [config]="control" [group]="parentForm"> </app-dynamic-control>
//                 }
//             </fieldset>
//         </div>
//     `,
//     styles: [
//         `
//             :host {
//                 display: block;
//                 box-sizing: border-box;
//                 /* grid-column handled by .responsive-col */
//                 /* DEBUG: outline the section host */
//                 outline: 1px dashed rgba(0, 0, 0, 0.06);
//             }

//             .section-card {
//                 box-sizing: border-box;
//                 padding: 8px;
//                 width: 100%;
//             }

//             .section-fieldset {
//                 border: 1px solid #ddd;
//                 border-radius: 4px;
//                 padding: 10px;
//                 margin: 0;
//                 height: 100%;
//                 background: #fafafa;
//                 display: grid;
//                 grid-template-columns: repeat(12, minmax(0, 1fr));
//                 gap: 12px;
//             }
//             legend {
//                 font-weight: bold;
//                 padding: 0 5px;
//             }
//         `,
//     ],
// })
// export class DynamicSectionComponent implements OnInit {
//     @Input({ required: true }) config!: FormSection;
//     @Input({ required: true }) parentForm!: FormGroup;

//     // Getter to cast controls to ControlDefinition[] (they are already resolved)
//     get resolvedControls(): ControlDefinition[] {
//         return this.config.controls as ControlDefinition[];
//     }

//     // Grid variables for host element
//     @HostBinding('style.--col-span-xs')
//     get hostColXs(): string {
//         return getResponsiveGridVars(this.config.width)['--col-span-xs'];
//     }

//     @HostBinding('style.--col-span-md')
//     get hostColMd(): string {
//         return getResponsiveGridVars(this.config.width)['--col-span-md'];
//     }

//     @HostBinding('style.--col-span-lg')
//     get hostColLg(): string {
//         return getResponsiveGridVars(this.config.width)['--col-span-lg'];
//     }

//     // Keep utility for backward compatibility, but it's no longer applied on an inner element
//     getWidthStyle(): Record<string, string> {
//         return getResponsiveWidthStyle(this.config.width);
//     }

//     ngOnInit() {
//         // Section configuration is handled at render time
//         // Form structure is now based on data paths, not section keys
//     }
// }
