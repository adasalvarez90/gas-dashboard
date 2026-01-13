// Libraries
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EffectsModule } from '@ngrx/effects';
import { StoreModule } from '@ngrx/store';
// Effects
import { AuthEffects } from './auth.effects';
// Reducers
import { authReducer } from './auth.reducer';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		EffectsModule.forFeature([AuthEffects]),
		StoreModule.forFeature('auth', authReducer)
	]
})
export class AuthModule { }
