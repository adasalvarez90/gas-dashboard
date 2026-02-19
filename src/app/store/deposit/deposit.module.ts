import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { depositReducer } from './deposit.reducer';
import { EffectsModule } from '@ngrx/effects';
import { DepositEffects } from './deposit.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([DepositEffects]),
		StoreModule.forFeature('deposits', depositReducer)
	]
})
export class DepositModule { }
