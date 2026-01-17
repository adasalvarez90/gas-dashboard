import { createReducer, on } from '@ngrx/store';
import { initialState, State } from './user.state';
import * as UsersActions from './user.actions';

export const userReducer = createReducer(
  initialState,

  on(UsersActions.loadUsers, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),

  on(UsersActions.loadUsersSuccess, (state, { users }) => ({
    ...state,
    list: users,
    loading: false,
  })),

  on(UsersActions.loadUsersFailure, (state, { error }) => ({
    ...state,
    loading: false,
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

  on(UsersActions.clearUsers, () => initialState)
);
