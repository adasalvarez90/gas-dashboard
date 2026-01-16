import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { UsersPage } from './users.page';

const routes: Routes = [
  {
    path: '',
    component: UsersPage
  },  {
    path: 'manage',
    loadChildren: () => import('./manage/manage.module').then( m => m.ManagePageModule)
  }

];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class UsersPageRoutingModule {}
