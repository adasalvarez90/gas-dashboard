import { createReducer, on } from '@ngrx/store';
import { initialState, State } from './user.state';
import * as UsersActions from './user.actions';

export const userReducer = createReducer(
	initialState,

	on(UsersActions.loadUsers, (state) => ({
		...state,
		loading: true,
		selected: null,
		error: null,
	})),

	on(UsersActions.loadUsersSuccess, (state, { users }) => ({
		...state,
		list: users,
		selected: null,
		loading: false,
	})),

	on(UsersActions.loadUsersFailure, (state, { error }) => ({
		...state,
		loading: false,
		selected: null,
		error,
	})),

	on(UsersActions.selectUser, (state, { user }) => ({
		...state,
		selected: user,
	})),

	on(UsersActions.createUserSuccess, (state, { user }) => ({
		...state,
		list: [...state.list, user],
		selected: user,
		loading: false,
	})),

	on(UsersActions.updateUserSuccess, (state, { user }) => ({
		...state,
		list: state.list.map((u) => (u.uid === user.uid ? user : u)),
		selected: user,
		loading: false,
	})),

	on(UsersActions.deleteUserSuccess, (state, { uid }) => ({
		...state,
		list: state.list.filter((u) => u.uid !== uid),
		selected: state.selected?.uid === uid ? null : state.selected,
		loading: false,
	})),

	// Search actions
	on(UsersActions.setSearchTerm, (state: State, { searchTerm }) => ({
		...state,
		searchTerm
	})),

	on(UsersActions.clearUsers, () => initialState)
);
