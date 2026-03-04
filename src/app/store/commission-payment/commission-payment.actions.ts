import { createAction, props } from '@ngrx/store';

import { CommissionPayment } from './commission-payment.model';
import { CommissionPaymentDraft } from 'src/app/models/commission-engine.model';

// Load
export const loadCommissionPayments = createAction('[CommissionPayments] Load', props<{ contractUid: string, advisorUid: string }>());
export const loadCommissionPaymentsSuccess = createAction('[CommissionPayments] Load Success', props<{ commissionPayments: CommissionPayment[] }>());
export const loadCommissionPaymentsFailure = createAction('[CommissionPayments] Load Failure', props<{ error: string }>());

// Select
export const selectCommissionPayment = createAction('[CommissionPayments] Select', props<{ commissionPayment: CommissionPayment }>());

// Create
export const createManyCommissionPayment = createAction('[CommissionPayments] Create', props<{ commissionPayments: CommissionPaymentDraft[] }>());
export const createCommissionPaymentSuccess = createAction('[CommissionPayments] Create Success', props<{ commissionPayments: CommissionPayment[] }>());
export const createCommissionPaymentFailure = createAction('[CommissionPayments] Create Failure', props<{ error: string }>());


// Search
export const setSearchTerm = createAction('[CommissionPayments] Set Search Term', props<{ searchTerm: string }>());

export const clearCommissionPayments = createAction('[CommissionPayments] Clear CommissionPayments');