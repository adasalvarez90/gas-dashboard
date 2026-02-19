import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CommissionConfigsPageRoutingModule } from './commission-configs-routing.module';

import { CommissionConfigsPage } from './commission-configs.page';

import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    PipesModule,
    IonicModule,
    CommissionConfigsPageRoutingModule
  ],
  declarations: [CommissionConfigsPage]
})
export class CommissionConfigsPageModule {}
