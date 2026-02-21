import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { MetricsPageRoutingModule } from './metrics-routing.module';

import { MetricsPage } from './metrics.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    MetricsPageRoutingModule
  ],
  declarations: [MetricsPage]
})
export class MetricsPageModule {}
