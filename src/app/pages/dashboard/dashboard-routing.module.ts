import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

// Guards
import { RoleGuard } from 'src/app/guards/role-guard';

import { DashboardPage } from './dashboard.page';

const routes: Routes = [
	{
		path: '',
		component: DashboardPage,

		children: [
			{
				path: '',
				pathMatch: 'full',
				redirectTo: 'users',
			},
			{
				path: 'users',
				loadChildren: () =>
					import('./users/users.module').then((m) => m.UsersPageModule),
				canActivate: [RoleGuard],
				data: {
					roles: [0, 1, 2], // Admin, Manager, Support
				},
			},
			{
				path: 'invites',
				loadChildren: () =>
					import('./invites/invites.module').then((m) => m.InvitesPageModule),
				canActivate: [RoleGuard],
				data: {
					roles: [0, 1], // Support and Admin
				},
			},
			{
				path: 'advisors',
				loadChildren: () => import('./advisors/advisors.module').then(m => m.AdvisorsPageModule),
				canActivate: [RoleGuard],
				data: {
					roles: [0, 1], // Support and Admin
				},
			},
			{
				path: 'contracts',
				loadChildren: () => import('./contracts/contracts.module').then(m => m.ContractsPageModule),
				canActivate: [RoleGuard],
				data: {
					roles: [0, 1], // Support and Admin
				},
			},
		],
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class DashboardPageRoutingModule { }
