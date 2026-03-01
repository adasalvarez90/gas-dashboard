import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { trancheReducer } from './tranche.reducer';
import { EffectsModule } from '@ngrx/effects';
import { TrancheEffects } from './tranche.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([TrancheEffects]),
		StoreModule.forFeature('tranches', trancheReducer)
	]
})
export class TrancheModule { }
