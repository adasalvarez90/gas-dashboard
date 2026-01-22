import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { inviteReducer } from './invite.reducer';
import { EffectsModule } from '@ngrx/effects';
import { InviteEffects } from './invite.effects';
import { IonicModule } from '@ionic/angular';

@NgModule({
	declarations: [],
	imports: [
		CommonModule,
		IonicModule,
		EffectsModule.forFeature([InviteEffects]),
		StoreModule.forFeature('invites', inviteReducer)
	]
})
export class InviteModule { }
