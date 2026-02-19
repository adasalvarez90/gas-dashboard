import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { commissionConfigReducer } from './commission-config.reducer';
import { EffectsModule } from '@ngrx/effects';
import { CommissionConfigEffects } from './commission-config.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([CommissionConfigEffects]),
		StoreModule.forFeature('commissionConfigs', commissionConfigReducer)
	]
})
export class CommissionConfigModule { }
