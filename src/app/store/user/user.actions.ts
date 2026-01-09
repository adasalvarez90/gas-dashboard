// Libraries
import { createAction, props } from '@ngrx/store';
import { Update } from '@ngrx/entity';
// Models
import { User } from './user.model';
import { ErrorMessage } from 'src/app/models/error-message.model';
/**
 * ACTIONS
 */
// Get all the items
export const query = createAction('[User] query');
export const addAll = createAction('[User] get success', props<{ users: Array<User>}>());
 // Create action
export const select = createAction('[User] select', props<{ id: number }>());
export const create = createAction('[User] create', props<{ user: FormData }>());
export const createSuccess = createAction('[User] create success');
export const createError = createAction('[User] create error', props<{ error: ErrorMessage}>());
export const update = createAction('[User] update', props<{ user: FormData }>());
export const updatePermissions = createAction('[User] update permissions', props<{ user: User }>());
export const updateSuccess = createAction('[User] update success');
export const updateError = createAction('[User] update error', props<{ error: ErrorMessage}>());
export const changePassword = createAction('[User] change password', props<{ user: Partial<User> }>());
export const remove = createAction('[User] remove', props<{ user: User }>());
export const removeSuccess = createAction('[User] remove success');
export const removeError = createAction('[User] remove error', props<{ error: ErrorMessage}>());
//
export const searchText = createAction('[User] search text', props<{ search: string }>());
// Entity actions
export const created = createAction('[User] created', props<{ user: User }>());
export const updated = createAction('[User] updated', props<{ user: Update<User> }>());
export const deleted = createAction('[User] deleted', props<{ id: number }>());
// Recovery
export const recovery = createAction('[User] recovery', props<{ username: string }>());
export const selectByToken = createAction('[User] select by token', props<{ token: string }>());
export const selectByTokenSuccess = createAction('[User] select by token success', props<{ user: Partial<User> }>());
export const newPassword = createAction('[User] New password', props<{ user: Partial<User> }>());


