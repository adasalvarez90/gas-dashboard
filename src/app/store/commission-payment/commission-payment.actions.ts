import { createAction, props } from '@ngrx/store';

import { CommissionPayment } from './commission-payment.model';

// Load
export const loadCommissionPayments = createAction('[CommissionPayments] Load', props<{ contractUid: string, advisorUid: string }>());
export const loadCommissionPaymentsSuccess = createAction('[CommissionPayments] Load Success', props<{ commissionPayments: CommissionPayment[] }>());
export const loadCommissionPaymentsFailure = createAction('[CommissionPayments] Load Failure', props<{ error: string }>());

// Select
export const selectCommissionPayment = createAction('[CommissionPayments] Select', props<{ commissionPayment: CommissionPayment }>());

// Create
export const createCommissionPayment = createAction('[CommissionPayments] Create', props<{ commissionPayment: CommissionPayment }>());
export const createCommissionPaymentSuccess = createAction('[CommissionPayments] Create Success', props<{ commissionPayment: CommissionPayment }>());
export const createCommissionPaymentFailure = createAction('[CommissionPayments] Create Failure', props<{ error: string }>());

// Update
export const updateCommissionPayment = createAction('[CommissionPayments] Update', props<{ commissionPayment: CommissionPayment }>());
export const updateCommissionPaymentSuccess = createAction('[CommissionPayments] Update Success', props<{ commissionPayment: CommissionPayment }>());
export const updateCommissionPaymentFailure = createAction('[CommissionPayments] Update Failure', props<{ error: string }>());

// Delete
export const deleteCommissionPayment = createAction('[CommissionPayments] Delete', props<{ uid: string }>());
export const deleteCommissionPaymentSuccess = createAction('[CommissionPayments] Delete Success', props<{ uid: string }>());
export const deleteCommissionPaymentFailure = createAction('[CommissionPayments] Delete Failure', props<{ error: string }>());

// Search
export const setSearchTerm = createAction('[CommissionPayments] Set Search Term', props<{ searchTerm: string }>());

export const clearCommissionPayments = createAction('[CommissionPayments] Clear CommissionPayments');