import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { CommissionsPage } from './commissions.page';

const routes: Routes = [
  {
    path: '',
    component: CommissionsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class CommissionsPageRoutingModule {}
