import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { InvitesPage } from './invites.page';

const routes: Routes = [
  {
    path: '',
    component: InvitesPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class InvitesPageRoutingModule {}
