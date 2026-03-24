import { createAction, props } from '@ngrx/store';

import { CommissionPayment } from './commission-payment.model';
import { CommissionPaymentDraft } from 'src/app/models/commission-engine.model';

// Load
export const loadCommissionPayments = createAction('[CommissionPayments] Load', props<{ trancheUid: string }>());
export const loadCommissionPaymentsSuccess = createAction('[CommissionPayments] Load Success', props<{ commissionPayments: CommissionPayment[] }>());
export const loadCommissionPaymentsFailure = createAction('[CommissionPayments] Load Failure', props<{ error: string }>());

// Load by contract (all tranches)
export const loadCommissionPaymentsByContract = createAction('[CommissionPayments] Load By Contract', props<{ contractUid: string }>());
export const loadCommissionPaymentsByContractSuccess = createAction('[CommissionPayments] Load By Contract Success', props<{ commissionPayments: CommissionPayment[] }>());
export const loadCommissionPaymentsByContractFailure = createAction('[CommissionPayments] Load By Contract Failure', props<{ error: string }>());

// Load by cutDate
export const loadCommissionPaymentsByCutDate = createAction('[CommissionPayments] Load By CutDate', props<{ cutDate: number }>());
export const loadCommissionPaymentsByCutDateSuccess = createAction('[CommissionPayments] Load By CutDate Success', props<{ commissionPayments: CommissionPayment[] }>());
export const loadCommissionPaymentsByCutDateFailure = createAction('[CommissionPayments] Load By CutDate Failure', props<{ error: string }>());

// Load for commission cuts page (histórico: todas las comisiones activas; start/end opcionales, legacy)
export const loadCommissionPaymentsForCuts = createAction(
	'[CommissionPayments] Load For Cuts',
	props<{ startCutDate?: number; endCutDate?: number }>(),
);
export const loadCommissionPaymentsForCutsSuccess = createAction('[CommissionPayments] Load For Cuts Success', props<{ commissionPayments: CommissionPayment[] }>());
export const loadCommissionPaymentsForCutsFailure = createAction('[CommissionPayments] Load For Cuts Failure', props<{ error: string }>());

// Select
export const selectCommissionPayment = createAction('[CommissionPayments] Select', props<{ commissionPayment: CommissionPayment }>());

// Create
export const createManyCommissionPayment = createAction('[CommissionPayments] Create', props<{ commissionPayments: CommissionPaymentDraft[] }>());
export const createCommissionPaymentSuccess = createAction('[CommissionPayments] Create Success', props<{ commissionPayments: CommissionPayment[] }>());
export const createCommissionPaymentFailure = createAction('[CommissionPayments] Create Failure', props<{ error: string }>());

// Mark paid (by cutDate + advisor - for Commission Cuts page)
export const markCommissionPaymentsPaidByCutDateAndAdvisor = createAction('[CommissionPayments] Mark Paid By CutDate And Advisor', props<{ cutDate: number; advisorUid: string; paidAt?: number }>());
export const markCommissionPaymentsPaidByCutDateAndAdvisorSuccess = createAction('[CommissionPayments] Mark Paid By CutDate And Advisor Success', props<{ cutDate: number; advisorUid: string; paidAt: number; updatedCount: number }>());
export const markCommissionPaymentsPaidByCutDateAndAdvisorFailure = createAction('[CommissionPayments] Mark Paid By CutDate And Advisor Failure', props<{ error: string }>());

// Mark paid (by payment UIDs - para selección de diferidas)
export const markCommissionPaymentsPaidByUids = createAction(
	'[CommissionPayments] Mark Paid By Uids',
	props<{ paymentUids: string[]; paidAt?: number; targetCutDate?: number }>()
);
export const markCommissionPaymentsPaidByUidsSuccess = createAction(
	'[CommissionPayments] Mark Paid By Uids Success',
	props<{ paymentUids: string[]; paidAt: number; updatedCount: number; targetCutDate?: number; originalCutDate?: number }>()
);
export const markCommissionPaymentsPaidByUidsFailure = createAction('[CommissionPayments] Mark Paid By Uids Failure', props<{ error: string }>());

// Mark paid (by tranche + advisor)
export const markCommissionPaymentsPaidByTrancheAndAdvisor = createAction('[CommissionPayments] Mark Paid By Tranche And Advisor', props<{ trancheUid: string; advisorUid: string; paidAt?: number }>());
export const markCommissionPaymentsPaidByTrancheAndAdvisorSuccess = createAction('[CommissionPayments] Mark Paid By Tranche And Advisor Success', props<{ trancheUid: string; advisorUid: string; paidAt: number; updatedCount: number }>());
export const markCommissionPaymentsPaidByTrancheAndAdvisorFailure = createAction('[CommissionPayments] Mark Paid By Tranche And Advisor Failure', props<{ error: string }>());

// Create adjustment (never mutates paid payments)
export const createAdjustmentCommissionPayment = createAction('[CommissionPayments] Create Adjustment', props<{
	adjustment: {
		contractUid: string;
		trancheUid: string;
		advisorUid: string;
		role: string;
		amount: number;
		dueDate: number;
		policyUid?: string;
		adjustsPaymentUid?: string;
		adjustmentReason?: string;
		scheme: string;
		grossCommissionPercent: number;
		roleSplitPercent: number;
	}
}>());
export const createAdjustmentCommissionPaymentSuccess = createAction('[CommissionPayments] Create Adjustment Success', props<{ commissionPayment: CommissionPayment }>());
export const createAdjustmentCommissionPaymentFailure = createAction('[CommissionPayments] Create Adjustment Failure', props<{ error: string }>());


// Search
export const setSearchTerm = createAction('[CommissionPayments] Set Search Term', props<{ searchTerm: string }>());

export const clearCommissionPayments = createAction('[CommissionPayments] Clear CommissionPayments');