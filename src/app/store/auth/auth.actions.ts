// Libraries
import { createAction, props } from '@ngrx/store';
// Models
import { ErrorMessage } from 'src/app/models/error-message.model';
import { Auth } from './auth.model';
/**
 * ACTIONS
 */
// Check
export const check = createAction('[Auth] Session');
export const sessionFailed = createAction('[Auth] Session failed');
export const sessionUpdated = createAction('[Auth] Session updated', props<{ auth: Auth }>());
// Login
export const login = createAction('[Auth] login', props<{ username: string, password: string }>());
export const loginSuccess = createAction('[Auth] login success', props<{ auth: Auth }>());
// Logout
export const logout = createAction('[Auth] logout');
export const logoutSuccess = createAction('[Auth] login success', props<{ auth: Auth }>());
// Log error
export const logError = createAction('[Auth] login error', props<{ error: ErrorMessage }>());
//
export const setModule = createAction('[Auth] set module', props<{ module: number }>());
