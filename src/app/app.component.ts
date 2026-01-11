import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormLayoutComponent } from './shared/layout/form-layout.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterModule, FormLayoutComponent],
    template: `
        <app-form-layout>
            <router-outlet />
        </app-form-layout>
    `,
})
export class AppComponent {}
