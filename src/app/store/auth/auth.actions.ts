import { createAction, props } from '@ngrx/store';
import { User } from '../user/user.model';

export const login = createAction('[Auth] Login', props<{ email: string; password: string }>());
export const loginSuccess = createAction('[Auth] Login Success', props<{ user: Partial<User> }>());
export const loginFailure = createAction('[Auth] Login Failure', props<{ error: any }>());

/** GOOGLE LOGIN */
export const loginWithGoogle = createAction('[Auth] Login With Google');

export const logout = createAction('[Auth] Logout');
export const logoutSuccess = createAction('[Auth] Logout Success');

export const sessionUpdated = createAction('[Auth] Session Updated', props<{ user: Partial<User> }>());

