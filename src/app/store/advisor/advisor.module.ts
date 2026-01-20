import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { advisorReducer } from './advisor.reducer';
import { EffectsModule } from '@ngrx/effects';
import { AdvisorEffects } from './advisor.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([AdvisorEffects]),
		StoreModule.forFeature('advisors', advisorReducer)
	]
})
export class AdvisorModule { }
