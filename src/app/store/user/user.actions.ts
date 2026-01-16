import { createAction, props } from '@ngrx/store';

import { User } from './user.model';

// Load
export const loadUsers = createAction('[Users] Load');
export const loadUsersSuccess = createAction('[Users] Load Success', props<{ users: User[] }>());
export const loadUsersFailure = createAction('[Users] Load Failure', props<{ error: string }>());

// Select
export const selectUser = createAction('[Users] Select', props<{ user: User }>());

// Create
export const createUser = createAction('[Users] Create', props<{ user: User }>());
export const createUserSuccess = createAction('[Users] Create Success', props<{ user: User }>());
export const createUserFailure = createAction('[Users] Create Failure', props<{ error: string }>());

// Update
export const updateUser = createAction('[Users] Update', props<{ user: User }>());
export const updateUserSuccess = createAction('[Users] Update Success', props<{ user: User }>());
export const updateUserFailure = createAction('[Users] Update Failure', props<{ error: string }>());

// Delete
export const deleteUser = createAction('[Users] Delete', props<{ uid: string }>());
export const deleteUserSuccess = createAction('[Users] Delete Success', props<{ uid: string }>());
export const deleteUserFailure = createAction('[Users] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[Users] Set Search Term', props<{ searchTerm: string }>());