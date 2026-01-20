import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './user.state';
import * as UsersActions from './user.actions';

export const userReducer = createReducer(
	initialState,

	on(UsersActions.loadUsers, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(UsersActions.loadUsersSuccess, (state, { users }) => adapter.setAll(users, { ...state, selected: null, loading: false })),

	on(UsersActions.loadUsersFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(UsersActions.selectUser, (state, { user }) => ({ ...state, selected: user, })),

	on(UsersActions.createUserSuccess, (state, { user }) => adapter.addOne(user, state)),

	on(UsersActions.updateUserSuccess, (state, { user }) => adapter.updateOne({ id: user.uid, changes: user, }, { ...state, selected: user, loading: false, })),

	on(UsersActions.deleteUserSuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(UsersActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(UsersActions.clearUsers, () => initialState)
);
