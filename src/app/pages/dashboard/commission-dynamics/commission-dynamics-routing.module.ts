import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

import { CommissionDynamicsListPage } from './commission-dynamics-list.page';
import { CommissionDynamicManagePage } from './commission-dynamic-manage.page';

const routes: Routes = [
	{
		path: '',
		component: CommissionDynamicsListPage,
	},
	{
		path: 'nueva',
		component: CommissionDynamicManagePage,
	},
	{
		path: 'editar/:uid',
		component: CommissionDynamicManagePage,
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class CommissionDynamicsPageRoutingModule {}
