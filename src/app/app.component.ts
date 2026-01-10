import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
        <div style="font-family: sans-serif;">
            <nav
                style="background: #333; color: white; padding: 10px 20px; display: flex; gap: 20px; align-items: center;"
            >
                <h3 style="margin: 0;">LexForm Demo</h3>
                <a
                    routerLink="/demo-app/EMP_001"
                    routerLinkActive="active"
                    style="color: white; text-decoration: none; padding: 5px 10px;"
                    >Employee 001</a
                >
                <a
                    routerLink="/demo-app/EMP_002"
                    routerLinkActive="active"
                    style="color: white; text-decoration: none; padding: 5px 10px;"
                    >Employee 002</a
                >
                <a
                    routerLink="/demo-control"
                    routerLinkActive="active"
                    style="color: white; text-decoration: none; padding: 5px 10px;"
                    >Demo Control</a
                >
                <a
                    routerLink="/form-admin"
                    routerLinkActive="active"
                    style="color: white; text-decoration: none; padding: 5px 10px;"
                    >Form Admin</a
                >
            </nav>
            <router-outlet></router-outlet>
        </div>
    `,
    styles: [
        `
            nav a.active {
                background: #555;
                border-radius: 4px;
            }
            nav a:hover {
                background: #444;
                border-radius: 4px;
            }
        `,
    ],
})
export class AppComponent {}
