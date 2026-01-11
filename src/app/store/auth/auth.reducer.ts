import { createReducer, on } from '@ngrx/store';
import * as AuthActions from './auth.actions';
// State
import { State, initialState } from './auth.state';

export const authReducer = createReducer(
  initialState,

  on(AuthActions.login, (state: State) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(AuthActions.loginSuccess, (state: State, { user }) => ({
    ...state,
    user,
    loading: false,
  })),
  on(AuthActions.loginFailure, (state: State, { error }) => ({
    ...state,
    error,
    loading: false,
  })),
  on(AuthActions.logoutSuccess, (state: State) => ({ ...state, user: null })),
  on(AuthActions.sessionUpdated, (state: State, { user }) => ({
    ...state,
    user,
  }))
);
