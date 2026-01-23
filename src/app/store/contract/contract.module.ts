import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { contractReducer } from './contract.reducer';
import { EffectsModule } from '@ngrx/effects';
import { ContractEffects } from './contract.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([ContractEffects]),
		StoreModule.forFeature('contracts', contractReducer)
	]
})
export class ContractModule { }
