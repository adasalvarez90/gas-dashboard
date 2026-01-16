import { createAction, props } from '@ngrx/store';
import { User } from '@angular/fire/auth';


export const login = createAction('[Auth] Login', props<{ email: string; password: string }>());

export const loginSuccess = createAction('[Auth] Login Success', props<{ user: Partial<User> }>());

export const loginFailure = createAction('[Auth] Login Failure', props<{ error: string }>());

export const logout = createAction('[Auth] Logout');

export const logoutSuccess = createAction('[Auth] Logout Success');

export const logoutFailure = createAction('[Auth] Logout Failure', props<{ error: string }>());

export const restoreSession = createAction('[Auth] Restore Session');

export const restoreSessionSuccess = createAction('[Auth] Restore Session Success', props<{ user: any }>());

export const restoreSessionFailure = createAction('[Auth] Restore Session Failure');
