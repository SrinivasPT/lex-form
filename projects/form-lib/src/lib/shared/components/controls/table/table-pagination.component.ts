import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-table-pagination',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="pagination-container" *ngIf="totalPages > 1 || totalItems > 0">
            <div class="page-summary">
                Showing {{ startItem }} - {{ endItem }} of {{ totalItems }}
            </div>

            <div class="page-controls" *ngIf="totalPages > 1">
                <button
                    (click)="changePage(currentPage - 1)"
                    [disabled]="currentPage === 1"
                    class="page-btn"
                >
                    &laquo; Prev
                </button>

                <span class="current-page">Page {{ currentPage }}</span>

                <button
                    (click)="changePage(currentPage + 1)"
                    [disabled]="currentPage === totalPages"
                    class="page-btn"
                >
                    Next &raquo;
                </button>
            </div>
        </div>
    `,
    styles: [
        `
            .pagination-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 10px 0;
                border-top: 1px solid #eee;
                margin-top: 10px;
                font-size: 0.9em;
            }
            .page-controls {
                display: flex;
                gap: 5px;
                align-items: center;
            }
            .page-btn {
                padding: 4px 10px;
                cursor: pointer;
                border: 1px solid #ccc;
                background: #fff;
                border-radius: 4px;
            }
            .page-btn:disabled {
                opacity: 0.5;
                cursor: not-allowed;
            }
        `,
    ],
})
export class TablePaginationComponent {
    @Input({ required: true }) totalItems = 0;
    @Input() pageSize = 10;
    @Input() currentPage = 1;

    @Output() pageChange = new EventEmitter<number>();

    get totalPages() {
        return Math.ceil(this.totalItems / this.pageSize);
    }
    get startItem() {
        return this.totalItems === 0 ? 0 : (this.currentPage - 1) * this.pageSize + 1;
    }
    get endItem() {
        return Math.min(this.currentPage * this.pageSize, this.totalItems);
    }

    changePage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.pageChange.emit(page);
        }
    }
}
