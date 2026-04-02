import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CommissionDynamicsPageRoutingModule } from './commission-dynamics-routing.module';
import { CommissionDynamicsListPage } from './commission-dynamics-list.page';
import { CommissionDynamicManagePage } from './commission-dynamic-manage.page';

@NgModule({
	imports: [CommonModule, FormsModule, IonicModule, CommissionDynamicsPageRoutingModule],
	declarations: [CommissionDynamicsListPage, CommissionDynamicManagePage],
})
export class CommissionDynamicsPageModule {}
