import { createAction, props } from '@ngrx/store';

import { Contract, ContractStatus } from './contract.model';

// Load
export const loadContracts = createAction('[Contracts] Load');
export const loadContractsSuccess = createAction('[Contracts] Load Success', props<{ contracts: Contract[] }>());
export const loadContractsFailure = createAction('[Contracts] Load Failure', props<{ error: string }>());

// Select
export const selectContract = createAction('[Contracts] Select', props<{ contract: Contract }>());

// Create (with optional first tranche when signed)
export const createContractWithInitialTranche = createAction('[Contracts] Create With Initial Tranche', props<{ contract: Contract; initialCapital: number }>());
export const createContract = createAction('[Contracts] Create Only', props<{ contract: Contract }>());
export const createContractSuccess = createAction('[Contracts] Create Success', props<{ contract: Contract }>());
export const createContractFailure = createAction('[Contracts] Create Failure', props<{ error: string }>());

// Update
export const updateContract = createAction('[Contracts] Update', props<{ contract: Contract }>());
export const updateContractSuccess = createAction('[Contracts] Update Success', props<{ contract: Contract }>());
export const updateContractFailure = createAction('[Contracts] Update Failure', props<{ error: string }>());

// Delete
export const deleteContract = createAction('[Contracts] Delete', props<{ uid: string }>());
export const deleteContractSuccess = createAction('[Contracts] Delete Success', props<{ uid: string }>());
export const deleteContractFailure = createAction('[Contracts] Delete Failure', props<{ error: string }>());

// Cancel (activo → cancelado + comisiones futuras)
export const cancelContract = createAction('[Contracts] Cancel', props<{ contract: Contract }>());
export const cancelContractSuccess = createAction('[Contracts] Cancel Success', props<{ contract: Contract }>());
export const cancelContractFailure = createAction('[Contracts] Cancel Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[Contracts] Set Search Term', props<{ searchTerm: string }>());

// Status filter
export const setStatusFilter = createAction('[Contracts] Set Status Filter', props<{ statusFilter: ContractStatus }>());

export const clearContracts = createAction('[Contracts] Clear Contracts');