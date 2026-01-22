import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './invite.state';
import * as InviteActions from './invite.actions';

export const inviteReducer = createReducer(
	initialState,

	on(InviteActions.loadInvites, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(InviteActions.loadInvitesSuccess, (state, { invites }) => adapter.setAll(invites, { ...state, selected: null, loading: false })),

	on(InviteActions.loadInvitesFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(InviteActions.selectInvite, (state, { invite }) => ({ ...state, selected: invite, })),

	on(InviteActions.createInviteSuccess, (state, { invite }) => adapter.addOne(invite, state)),

	on(InviteActions.updateInviteMetricsSuccess, (state, { inviteUid, changes }) => adapter.updateOne({ id: inviteUid, changes, }, { ...state, selected: null, loading: false, })),

	// Search actions
	on(InviteActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(InviteActions.clearInvites, () => initialState)
);
