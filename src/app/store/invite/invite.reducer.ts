import { createReducer, on } from '@ngrx/store';
import { createEntityAdapter, EntityState } from '@ngrx/entity';

import * as InviteActions from './invite.actions';
import { Invite } from './invite.model';

export interface InviteState extends EntityState<Invite> {
	loading: boolean;
	searchTerm: string;
	error?: string;
}

export const inviteAdapter = createEntityAdapter<Invite>({ selectId: (invite) => invite.id, sortComparer: (a, b) => b.createdAt - a.createdAt });

export const initialState: InviteState = inviteAdapter.getInitialState({ loading: false, searchTerm: '' });

export const inviteReducer = createReducer(
	initialState,

	on(InviteActions.loadInvites, (state) => ({ ...state, loading: true, error: undefined })),

	on(InviteActions.loadInvitesSuccess, (state, { invites }) => inviteAdapter.setAll(invites, { ...state, loading: false })),

	on(InviteActions.loadInvitesFailure, (state, { error }) => ({ ...state, loading: false, error })),

	on(InviteActions.createInviteSuccess, (state, { invite }) => inviteAdapter.addOne(invite, state)),

	// Search actions
	on(InviteActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),
);
