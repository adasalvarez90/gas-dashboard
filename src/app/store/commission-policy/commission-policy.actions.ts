import { createAction, props } from '@ngrx/store';

import { CommissionPolicy } from './commission-policy.model';

// Load
export const loadCommissionPolicies = createAction('[CommissionPolicies] Load');
export const loadCommissionPoliciesSuccess = createAction('[CommissionPolicies] Load Success', props<{ commissionPolicies: CommissionPolicy[] }>());
export const loadCommissionPoliciesFailure = createAction('[CommissionPolicies] Load Failure', props<{ error: string }>());

// Select
export const selectCommissionPolicy = createAction('[CommissionPolicies] Select', props<{ commissionPolicy: CommissionPolicy }>());

// Create
export const createCommissionPolicy = createAction('[CommissionPolicies] Create', props<{ commissionPolicy: CommissionPolicy }>());
export const createCommissionPolicySuccess = createAction('[CommissionPolicies] Create Success', props<{ commissionPolicy: CommissionPolicy }>());
export const createCommissionPolicyFailure = createAction('[CommissionPolicies] Create Failure', props<{ error: string }>());

// Update
export const updateCommissionPolicy = createAction('[CommissionPolicies] Update', props<{ commissionPolicy: CommissionPolicy }>());
export const updateCommissionPolicySuccess = createAction('[CommissionPolicies] Update Success', props<{ commissionPolicy: CommissionPolicy }>());
export const updateCommissionPolicyFailure = createAction('[CommissionPolicies] Update Failure', props<{ error: string }>());

// Delete
export const deleteCommissionPolicy = createAction('[CommissionPolicies] Delete', props<{ uid: string }>());
export const deleteCommissionPolicySuccess = createAction('[CommissionPolicies] Delete Success', props<{ uid: string }>());
export const deleteCommissionPolicyFailure = createAction('[CommissionPolicies] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[CommissionPolicies] Set Search Term', props<{ searchTerm: string }>());

export const clearCommissionPolicies = createAction('[CommissionPolicies] Clear CommissionPolicies');