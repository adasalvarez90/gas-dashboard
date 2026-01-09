// Libraries
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
// Effects
import { AuthEffects } from './auth.effects';
// Reducers
import { reducer } from './auth.reducer';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		EffectsModule.forFeature([AuthEffects]),
		StoreModule.forFeature('auth', reducer)
	]
})
export class AuthModule { }
