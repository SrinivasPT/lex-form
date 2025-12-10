import { Routes } from '@angular/router';
import { DemoControlComponent } from './demo-control/demo-control.component';
import { DemoAppComponent } from './demo-app/demo-app.component';

export const routes: Routes = [
    { path: '', redirectTo: '/demo', pathMatch: 'full' },
    { path: 'demo-control', component: DemoControlComponent },
    { path: 'demo-app', component: DemoAppComponent },
];
