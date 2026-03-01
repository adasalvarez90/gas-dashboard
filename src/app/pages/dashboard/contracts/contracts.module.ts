import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ContractsPageRoutingModule } from './contracts-routing.module';

import { ContractsPage } from './contracts.page';

import { PipesModule } from 'src/app/pipes/pipes.module';

// Components
import { ContractsListComponent } from './components/contracts-list/contracts-list.component';
import { ContractPanelComponent } from './components/contract-panel/contract-panel.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ContractsListComponent,
    ContractPanelComponent,
    PipesModule,
    IonicModule,
    ContractsPageRoutingModule
  ],
  declarations: [ContractsPage]
})
export class ContractsPageModule {}
