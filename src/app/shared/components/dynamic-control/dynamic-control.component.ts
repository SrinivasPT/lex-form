import { Component, Input, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormGroup } from '@angular/forms';
import { Subscription, startWith } from 'rxjs';

// Core
import { ControlDefinition } from '../../../core/models/form-schema.interface';

// Child Components
import { ExpressionEvaluatorService } from '../../../core/services/expression-evaluator.service';
import { InputControlComponent } from '../controls/input-control.component';
// import { SelectControlComponent } from ... (Future)
// import { TableControlComponent } from ... (Future)

@Component({
    selector: 'app-dynamic-control',
    standalone: true,
    imports: [
        CommonModule,
        ReactiveFormsModule,
        InputControlComponent,
        // Add other components here as you build them
    ],
    template: `
        @if (isVisible()) { @switch (config.type) { @case ('text') {
        <app-input-control [config]="config" [group]="group"> </app-input-control>
        } @case ('number') {
        <app-input-control [config]="config" [group]="group"> </app-input-control>
        } @case ('select') {
        <div>[Select: {{ config.label }}]</div>
        } @case ('table') {
        <div>[Table: {{ config.label }}]</div>
        } @default {
        <div class="unknown-control">Unknown type: {{ config.type }}</div>
        } } }
    `,
})
export class DynamicControlComponent implements OnInit, OnDestroy {
    @Input({ required: true }) config!: ControlDefinition;
    @Input({ required: true }) group!: FormGroup;

    private evaluator = inject(ExpressionEvaluatorService);
    private sub?: Subscription;

    // Signal for visibility (Reactive UI)
    isVisible = signal<boolean>(true);

    ngOnInit() {
        // If there is no visibility rule, we are always visible.
        if (!this.config.visibleWhen) {
            return;
        }

        // LISTENER: We need to watch the ROOT form for changes.
        // Why Root? Because "visibleWhen" might depend on a field in a different section.
        // e.g. "Show State if Country (in section A) is US"
        const rootForm = this.group.root;

        this.sub = rootForm.valueChanges
            .pipe(
                // Trigger immediately with current value
                startWith(rootForm.value)
            )
            .subscribe((rootValue) => {
                this.evaluateVisibility(rootValue);
            });
    }

    private evaluateVisibility(rootModel: any) {
        // 1. Prepare Context
        // Global context: "model.firstName"
        // We could also add local context here if needed
        const context = { model: rootModel };

        // 2. Evaluate
        const result = this.evaluator.evaluate(this.config.visibleWhen, context);

        // 3. Update Signal
        this.isVisible.set(result);

        // OPTIONAL: If invisible, should we disable the control
        // so it doesn't block form validation?
        const control = this.group.get(this.config.key);
        if (control) {
            if (result) {
                control.enable({ emitEvent: false });
            } else {
                control.disable({ emitEvent: false });
            }
        }
    }

    ngOnDestroy() {
        this.sub?.unsubscribe();
    }
}
