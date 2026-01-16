import { createReducer, on } from '@ngrx/store';
import * as AuthActions from './auth.actions';
import { User } from '@angular/fire/auth';

export interface AuthState {
  user: Partial<User> | null;
  loading: boolean;
  error: string | null;
}

export const initialState: AuthState = {
  user: null,
  loading: false,
  error: null,
};

export const authReducer = createReducer(
  initialState,

  on(AuthActions.login, (state) => ({ ...state, loading: true, error: null })),

  on(AuthActions.loginSuccess, (state, { user }) => ({
    ...state,
    user,
    isAuthenticated: true,
    loading: false,
    error: null,
  })),

  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    isAuthenticated: false,
    error,
    loading: false,
  })),

  on(AuthActions.logoutSuccess, (state) => ({
    ...state,
    user: null,
    isAuthenticated: false,
    loading: false,
  })),

  on(AuthActions.restoreSession, (state) => ({
    ...state,
    loading: true,
  })),

  on(AuthActions.restoreSessionSuccess, (state, { user }) => ({
    ...state,
    user,
    isAuthenticated: true,
    loading: false,
    error: null,
  })),

  on(AuthActions.restoreSessionFailure, (state) => ({
    ...state,
    user: null,
    isAuthenticated: false,
    loading: false,
  }))
);
