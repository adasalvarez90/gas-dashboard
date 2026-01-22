import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import * as InviteActions from './invite.actions';
import * as InviteSelectors from './invite.selectors';
import { Invite } from './invite.model';

@Injectable({ providedIn: 'root' })
export class InviteFacade {
	invites$ = this.store.select(InviteSelectors.selectFiltered);
	loading$ = this.store.select(InviteSelectors.selectLoading);
	search$ = this.store.select(InviteSelectors.selectSearch);
	total$ = this.store.select(InviteSelectors.selectTotal);
	selectInvitesWithComputedFlags$ = this.store.select(InviteSelectors.selectInvitesWithComputedFlags);

	constructor(private store: Store) { }

	loadInvites() {
		this.store.dispatch(InviteActions.loadInvites());
	}

	createInvite(invite) {
		this.store.dispatch(InviteActions.createInvite({ invite }));
	}

	resendInvite(invite: Invite) {
		this.store.dispatch(InviteActions.resendInvite({ invite }));
	}

	cancelInvite(inviteUid: string) {
		this.store.dispatch(InviteActions.cancelInvite({ inviteUid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(InviteActions.setSearchTerm({ searchTerm }));
	}

	updateInviteMetrics(inviteUid: string, changes: Partial<Invite>) {
		this.store.dispatch(InviteActions.updateInviteMetrics({inviteUid, changes}));
	}
}
