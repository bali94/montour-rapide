import { Routes } from '@angular/router';
import { ClientComponent } from './client/client';
import { CashierComponent } from './cashier/cashier';
import { LoginComponent } from './auth/login/login';
import { authGuard } from './auth/auth-guard';
import { QueueManagementComponent } from './cashier/queue-management/queue-management';
import { CompanyManagementComponent } from './admin/company-management/company-management';
import { AgentManagementComponent } from './admin/agent-management/agent-management.component'; // Import AgentManagementComponent

export const routes: Routes = [
  { path: 'client', component: ClientComponent },
  { path: 'caisse', component: CashierComponent, canActivate: [authGuard] },
  { path: 'queue-management', component: QueueManagementComponent, canActivate: [authGuard] },
  { path: 'admin/companies', component: CompanyManagementComponent, canActivate: [authGuard], data: { role: 'admin' } },
  { path: 'admin/agents', component: AgentManagementComponent, canActivate: [authGuard], data: { role: 'admin' } }, // Add agent management route with admin role
  { path: 'login', component: LoginComponent },
  { path: '', redirectTo: '/client', pathMatch: 'full' },
  { path: '**', redirectTo: '/client' }
];
