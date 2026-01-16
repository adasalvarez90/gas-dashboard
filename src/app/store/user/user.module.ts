import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { userReducer } from './user.reducer';
import { EffectsModule } from '@ngrx/effects';
import { UserEffects } from './user.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([UserEffects]),
		StoreModule.forFeature('user', userReducer)
	]
})
export class UserModule { }
