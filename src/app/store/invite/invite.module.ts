import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { inviteReducer } from './invite.reducer';
import { InviteEffects } from './invite.effects';

@NgModule({
  imports: [
    CommonModule,
    StoreModule.forFeature('invites', inviteReducer),
    EffectsModule.forFeature([InviteEffects]),
  ],
})
export class InviteModule {}
