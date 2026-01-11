import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormLayoutComponent } from './shared/layout/form-layout.component';
import { ToastContainerComponent } from './shared/components/toast-container.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, FormLayoutComponent, ToastContainerComponent],
    template: `
        <app-form-layout>
            <router-outlet />
        </app-form-layout>
        <app-toast-container />
    `,
})
export class AppComponent {}
