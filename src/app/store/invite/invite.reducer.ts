import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter } from '@ngrx/entity';

import * as InviteActions from './invite.actions';
import { Invite } from './invite.model';
import { initialState } from './invite.state';

export const inviteAdapter = createEntityAdapter<Invite>({ selectId: (invite) => invite.id, sortComparer: (a, b) => b.createdAt - a.createdAt });

export const inviteReducer = createReducer(
	initialState,

	on(InviteActions.loadInvites, (state) => ({ ...state, loading: true, error: undefined })),

	on(InviteActions.loadInvitesSuccess, (state, { invites }) => inviteAdapter.setAll(invites, { ...state, loading: false })),

	on(InviteActions.loadInvitesFailure, (state, { error }) => ({ ...state, loading: false, error })),

	on(InviteActions.createInviteSuccess, (state, { invite }) => inviteAdapter.addOne(invite, state)),

	on(InviteActions.updateInviteMetricsSuccess, (state, { inviteId, changes }) => ({ ...state, list: state.list.map(invite => invite.id === inviteId ? { ...invite, ...changes } : invite) })),

	// Search actions
	on(InviteActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),
);
