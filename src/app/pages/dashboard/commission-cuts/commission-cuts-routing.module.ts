import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CommissionCutsPage } from './commission-cuts.page';
import { CommissionCutsResolver } from './commission-cuts.resolver';

const routes: Routes = [
	{
		path: '',
		component: CommissionCutsPage,
		resolve: { _: CommissionCutsResolver },
	},
];

@NgModule({
	imports: [RouterModule.forChild(routes)],
	exports: [RouterModule],
})
export class CommissionCutsPageRoutingModule {}
