import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { commissionReducer } from './commission.reducer';
import { EffectsModule } from '@ngrx/effects';
import { CommissionEffects } from './commission.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([CommissionEffects]),
		StoreModule.forFeature('commissions', commissionReducer)
	]
})
export class CommissionModule { }
