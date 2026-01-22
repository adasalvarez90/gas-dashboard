import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { AdvisorsPage } from './advisors.page';

const routes: Routes = [
  {
    path: '',
    component: AdvisorsPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdvisorsPageRoutingModule {}
