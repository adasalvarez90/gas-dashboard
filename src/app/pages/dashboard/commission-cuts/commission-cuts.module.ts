import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { CommissionCutsPageRoutingModule } from './commission-cuts-routing.module';

import { CommissionCutsPage } from './commission-cuts.page';
import { ProcessDeferredModalComponent } from 'src/app/components/process-deferred-modal/process-deferred-modal.component';

import { PipesModule } from 'src/app/pipes/pipes.module';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    PipesModule,
    IonicModule,
    CommissionCutsPageRoutingModule,
    ProcessDeferredModalComponent,
  ],
  declarations: [CommissionCutsPage]
})
export class CommissionCutsPageModule {}
