import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { commissionPaymentReducer } from './commission-payment.reducer';
import { EffectsModule } from '@ngrx/effects';
import { CommissionPaymentEffects } from './commission-payment.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([CommissionPaymentEffects]),
		StoreModule.forFeature('commissionPayments', commissionPaymentReducer)
	]
})
export class CommissionPaymentModule { }
