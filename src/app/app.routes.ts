import { Routes } from '@angular/router';
import { DemoControlComponent } from './demo-control/demo-control.component';
import { DemoAppComponent } from './demo-app/demo-app.component';
import { FormAdminControlComponent } from './form-admin/form-admin-control.component';

export const routes: Routes = [
    { path: '', redirectTo: '/demo-app', pathMatch: 'full' },
    { path: 'demo-control', component: DemoControlComponent },
    { path: 'demo-app', component: DemoAppComponent },
    { path: 'form-admin', component: FormAdminControlComponent },
];
