import { createAction, props } from '@ngrx/store';

import { Tranche } from './tranche.model';

// Load
export const loadTranches = createAction('[Tranches] Load', props<{ contractUid: string }>());
export const loadTranchesSuccess = createAction('[Tranches] Load Success', props<{ tranches: Tranche[] }>());
export const loadTranchesFailure = createAction('[Tranches] Load Failure', props<{ error: string }>());

// Select
export const selectTranche = createAction('[Tranches] Select', props<{ tranche: Tranche }>());

// Create
export const createTranche = createAction('[Tranches] Create', props<{ tranche: Tranche }>());
export const createTrancheSuccess = createAction('[Tranches] Create Success', props<{ tranche: Tranche }>());
export const createTrancheFailure = createAction('[Tranches] Create Failure', props<{ error: string }>());

// Update
export const updateTranche = createAction('[Tranches] Update', props<{ tranche: Tranche }>());
export const updateTrancheSuccess = createAction('[Tranches] Update Success', props<{ tranche: Tranche }>());
export const updateTrancheFailure = createAction('[Tranches] Update Failure', props<{ error: string }>());

// Delete
export const deleteTranche = createAction('[Tranches] Delete', props<{ uid: string }>());
export const deleteTrancheSuccess = createAction('[Tranches] Delete Success', props<{ uid: string }>());
export const deleteTrancheFailure = createAction('[Tranches] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[Tranches] Set Search Term', props<{ searchTerm: string }>());

export const clearTranches = createAction('[Tranches] Clear Tranches');