import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import * as InviteActions from './invite.actions';
import * as InviteSelectors from './invite.selectors';
import { Invite } from './invite.model';

@Injectable({ providedIn: 'root' })
export class InviteFacade {
  invites$ = this.store.select(InviteSelectors.selectAllInvites);
  loading$ = this.store.select(InviteSelectors.selectInvitesLoading);

  constructor(private store: Store) {}

  loadInvites() {
	this.store.dispatch(InviteActions.loadInvites());
  }

  createInvite(email: string, role: 1 | 2) {
	this.store.dispatch(InviteActions.createInvite({ email, role }));
  }

  resendInvite(invite: Invite) {
	this.store.dispatch(InviteActions.resendInvite({ invite }));
  }

  cancelInvite(inviteId: string) {
	this.store.dispatch(InviteActions.cancelInvite({ inviteId }));
  }
}
