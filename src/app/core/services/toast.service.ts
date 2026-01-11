import { Injectable, signal } from '@angular/core';

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration: number;
}

/**
 * Simple toast notification service
 * Displays temporary messages at the top of the screen
 */
@Injectable({
    providedIn: 'root',
})
export class ToastService {
    private nextId = 0;
    readonly toasts = signal<Toast[]>([]);

    /**
     * Show success message
     */
    success(message: string, duration = 3000): void {
        this.show(message, 'success', duration);
    }

    /**
     * Show error message
     */
    error(message: string, duration = 5000): void {
        this.show(message, 'error', duration);
    }

    /**
     * Show info message
     */
    info(message: string, duration = 3000): void {
        this.show(message, 'info', duration);
    }

    /**
     * Show warning message
     */
    warning(message: string, duration = 4000): void {
        this.show(message, 'warning', duration);
    }

    /**
     * Show toast notification
     */
    private show(message: string, type: Toast['type'], duration: number): void {
        const toast: Toast = {
            id: this.nextId++,
            message,
            type,
            duration,
        };

        this.toasts.update((toasts) => [...toasts, toast]);

        // Auto-remove after duration
        setTimeout(() => {
            this.remove(toast.id);
        }, duration);
    }

    /**
     * Remove toast by id
     */
    remove(id: number): void {
        this.toasts.update((toasts) => toasts.filter((t) => t.id !== id));
    }

    /**
     * Clear all toasts
     */
    clear(): void {
        this.toasts.set([]);
    }
}
