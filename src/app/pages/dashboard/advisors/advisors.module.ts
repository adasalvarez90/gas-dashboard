import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { AdvisorsPageRoutingModule } from './advisors-routing.module';

import { AdvisorsPage } from './advisors.page';

import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    PipesModule,
    IonicModule,
    AdvisorsPageRoutingModule
  ],
  declarations: [AdvisorsPage]
})
export class AdvisorsPageModule {}
