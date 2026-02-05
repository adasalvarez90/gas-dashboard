import { createAction, props } from '@ngrx/store';

import { Commission } from './commission.model';

// Load
export const loadCommissions = createAction('[Commissions] Load');
export const loadCommissionsSuccess = createAction('[Commissions] Load Success', props<{ commissions: Commission[] }>());
export const loadCommissionsFailure = createAction('[Commissions] Load Failure', props<{ error: string }>());

// Select
export const selectCommission = createAction('[Commissions] Select', props<{ commission: Commission }>());

// Create
export const createCommission = createAction('[Commissions] Create', props<{ commission: Commission }>());
export const createCommissionSuccess = createAction('[Commissions] Create Success', props<{ commission: Commission }>());
export const createCommissionFailure = createAction('[Commissions] Create Failure', props<{ error: string }>());

// Update
export const updateCommission = createAction('[Commissions] Update', props<{ commission: Commission }>());
export const updateCommissionSuccess = createAction('[Commissions] Update Success', props<{ commission: Commission }>());
export const updateCommissionFailure = createAction('[Commissions] Update Failure', props<{ error: string }>());

// Delete
export const deleteCommission = createAction('[Commissions] Delete', props<{ uid: string }>());
export const deleteCommissionSuccess = createAction('[Commissions] Delete Success', props<{ uid: string }>());
export const deleteCommissionFailure = createAction('[Commissions] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[Commissions] Set Search Term', props<{ searchTerm: string }>());

export const clearCommissions = createAction('[Commissions] Clear Commissions');