import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CommissionConfigsPage } from './commission-configs.page';

const routes: Routes = [
  {
    path: '',
    component: CommissionConfigsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommissionConfigsPageRoutingModule {}
