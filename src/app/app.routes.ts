import { Routes } from '@angular/router';
import { DemoControlComponent } from './demo-control/demo-control.component';
import { DemoAppComponent } from './demo-app/demo-app.component';
import { FormAdminControlComponent } from './form-admin/form-admin-control.component';
import { FormContentResolver } from '../../projects/form-lib/src/lib/core/resolvers/form-content.resolver';

export const routes: Routes = [
    { path: '', redirectTo: '/demo-app/EMP_001', pathMatch: 'full' },
    { path: 'demo-control', component: DemoControlComponent },
    {
        path: 'demo-app/:id',
        component: DemoAppComponent,
        resolve: { formContent: FormContentResolver },
        data: { formId: 'employee_form' },
    },
    {
        path: 'form-admin/:formCode',
        component: FormAdminControlComponent,
    },
    {
        path: 'form-admin',
        redirectTo: '/form-admin/control_form',
        pathMatch: 'full',
    },
];
