import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime } from 'rxjs';
import { ActionDefinition } from '../../../../core/models/form-schema.interface';

@Component({
    selector: 'app-table-toolbar',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    template: `
        <div class="toolbar-container">
            <div class="header-actions">
                <ng-content></ng-content>
                <button
                    *ngFor="let act of actions"
                    class="btn-sm"
                    [class]="act.cssClass"
                    (click)="actionClick.emit(act)"
                >
                    <i *ngIf="act.icon" [class]="act.icon"></i> {{ act.label }}
                </button>
            </div>

            <div class="search-wrapper" *ngIf="searchable">
                <input
                    [formControl]="searchControl"
                    type="text"
                    placeholder="Search records..."
                    class="search-input"
                />
            </div>
        </div>
    `,
    styles: [
        `
            .toolbar-container {
                display: flex;
                flex-wrap: wrap;
                justify-content: space-between;
                align-items: center;
                padding: 8px 0;
                margin-bottom: 8px;
                gap: 10px;
            }
            .header-actions {
                display: flex;
                gap: 8px;
                align-items: center;
            }
            .search-input {
                padding: 6px 10px;
                border: 1px solid #ccc;
                border-radius: 4px;
                min-width: 200px;
            }
            .btn-sm {
                padding: 5px 10px;
                cursor: pointer;
            }
        `,
    ],
})
export class TableToolbarComponent {
    @Input() searchable = false;
    @Input() actions: ActionDefinition[] = [];

    @Output() search = new EventEmitter<string>();
    @Output() actionClick = new EventEmitter<ActionDefinition>();

    searchControl = new FormControl('');

    constructor() {
        this.searchControl.valueChanges
            .pipe(debounceTime(300))
            .subscribe((val) => this.search.emit(val || ''));
    }
}
