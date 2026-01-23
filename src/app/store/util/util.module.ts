// Libraries
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';

// Effects
import { UtilEffects } from './util.effects';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		EffectsModule.forFeature([UtilEffects]),
	]
})
export class UtilModule { }
