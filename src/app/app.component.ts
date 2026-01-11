import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div class="app-container">
            <nav class="app-nav">
                <h3 class="app-nav-title">LexForm Demo</h3>
                <a routerLink="/demo-app/EMP_001" routerLinkActive="active" class="app-nav-link"
                    >Employee 001</a
                >
                <a routerLink="/demo-app/EMP_002" routerLinkActive="active" class="app-nav-link"
                    >Employee 002</a
                >
                <a routerLink="/demo-control" routerLinkActive="active" class="app-nav-link"
                    >Demo Control</a
                >
                <a routerLink="/form-admin" routerLinkActive="active" class="app-nav-link"
                    >Form Admin</a
                >
            </nav>
            <router-outlet></router-outlet>
        </div>
    `,
})
export class AppComponent {}
