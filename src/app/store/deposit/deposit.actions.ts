import { createAction, props } from '@ngrx/store';

import { Deposit } from './deposit.model';

// Load
export const loadDeposits = createAction('[Deposits] Load', props<{ contractUid: string }>());
export const loadDepositsSuccess = createAction('[Deposits] Load Success', props<{ deposits: Deposit[] }>());
export const loadDepositsFailure = createAction('[Deposits] Load Failure', props<{ error: string }>());

// Select
export const selectDeposit = createAction('[Deposits] Select', props<{ deposit: Deposit }>());

// Create
export const createDeposit = createAction('[Deposits] Create', props<{ deposit: Deposit }>());
export const createDepositSuccess = createAction('[Deposits] Create Success', props<{ deposit: Deposit }>());
export const createDepositFailure = createAction('[Deposits] Create Failure', props<{ error: string }>());

// Update
export const updateDeposit = createAction('[Deposits] Update', props<{ deposit: Deposit }>());
export const updateDepositSuccess = createAction('[Deposits] Update Success', props<{ deposit: Deposit }>());
export const updateDepositFailure = createAction('[Deposits] Update Failure', props<{ error: string }>());

// Delete
export const deleteDeposit = createAction('[Deposits] Delete', props<{ uid: string }>());
export const deleteDepositSuccess = createAction('[Deposits] Delete Success', props<{ uid: string }>());
export const deleteDepositFailure = createAction('[Deposits] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[Deposits] Set Search Term', props<{ searchTerm: string }>());

export const clearDeposits = createAction('[Deposits] Clear Deposits');