import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { commissionPolicyReducer } from './commission-policy.reducer';
import { EffectsModule } from '@ngrx/effects';
import { CommissionPolicyEffects } from './commission-policy.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([CommissionPolicyEffects]),
		StoreModule.forFeature('commissionPolicies', commissionPolicyReducer)
	]
})
export class CommissionPolicyModule { }
