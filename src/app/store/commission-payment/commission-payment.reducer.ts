import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './commission-payment.state';
import * as CommissionPaymentsActions from './commission-payment.actions';

export const commissionPaymentReducer = createReducer(
	initialState,

	on(CommissionPaymentsActions.loadCommissionPayments, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsSuccess, (state, { commissionPayments }) => adapter.setAll(commissionPayments, { ...state, selected: null, loading: false })),

	on(CommissionPaymentsActions.loadCommissionPaymentsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsByContract, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsByContractSuccess, (state, { commissionPayments }) => adapter.setAll(commissionPayments, { ...state, selected: null, loading: false })),

	on(CommissionPaymentsActions.loadCommissionPaymentsByContractFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsByCutDate, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsByCutDateSuccess, (state, { commissionPayments }) => adapter.setAll(commissionPayments, { ...state, selected: null, loading: false })),

	on(CommissionPaymentsActions.loadCommissionPaymentsByCutDateFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsForCuts, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsForCutsSuccess, (state, { commissionPayments }) => adapter.setAll(commissionPayments, { ...state, selected: null, loading: false })),

	on(CommissionPaymentsActions.loadCommissionPaymentsForCutsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionPaymentsActions.selectCommissionPayment, (state, { commissionPayment }) => ({ ...state, selected: commissionPayment, })),

	on(CommissionPaymentsActions.createCommissionPaymentSuccess, (state, { commissionPayments }) => adapter.addMany(commissionPayments, state)),

	on(CommissionPaymentsActions.createAdjustmentCommissionPaymentSuccess, (state, { commissionPayment }) => adapter.addOne(commissionPayment, state)),

	// Mark paid by cutDate
	on(CommissionPaymentsActions.markCommissionPaymentsPaidByCutDate, (state) => ({ ...state, loading: true, error: null })),

	on(CommissionPaymentsActions.markCommissionPaymentsPaidByCutDateSuccess, (state, { cutDate, paidAt }) => {
		const updates = Object.values(state.entities)
			.filter((p) => !!p && p.cutDate === cutDate && !p.paid && !p.cancelled)
			.map((p) => ({
				id: p!.uid,
				changes: { paid: true, paidAt },
			}));

		return adapter.updateMany(updates, { ...state, loading: false });
	}),

	on(CommissionPaymentsActions.markCommissionPaymentsPaidByCutDateFailure, (state, { error }) => ({ ...state, loading: false, error })),

	// Mark paid by cutDate + advisor
	on(CommissionPaymentsActions.markCommissionPaymentsPaidByCutDateAndAdvisor, (state) => ({ ...state, loading: true, error: null })),
	on(CommissionPaymentsActions.markCommissionPaymentsPaidByCutDateAndAdvisorSuccess, (state, { cutDate, advisorUid, paidAt }) => {
		const updates = Object.values(state.entities)
			.filter((p) => !!p && p.cutDate === cutDate && p.advisorUid === advisorUid && !p.paid && !p.cancelled)
			.map((p) => ({ id: p!.uid, changes: { paid: true, paidAt } }));
		return adapter.updateMany(updates, { ...state, loading: false });
	}),
	on(CommissionPaymentsActions.markCommissionPaymentsPaidByCutDateAndAdvisorFailure, (state, { error }) => ({ ...state, loading: false, error })),

	// Mark paid by tranche + advisor
	on(CommissionPaymentsActions.markCommissionPaymentsPaidByTrancheAndAdvisor, (state) => ({ ...state, loading: true, error: null })),
	on(CommissionPaymentsActions.markCommissionPaymentsPaidByTrancheAndAdvisorSuccess, (state, { trancheUid, advisorUid, paidAt }) => {
		const updates = Object.values(state.entities)
			.filter((p) => !!p && p.trancheUid === trancheUid && p.advisorUid === advisorUid && !p.paid && !p.cancelled)
			.map((p) => ({ id: p!.uid, changes: { paid: true, paidAt } }));
		return adapter.updateMany(updates, { ...state, loading: false });
	}),
	on(CommissionPaymentsActions.markCommissionPaymentsPaidByTrancheAndAdvisorFailure, (state, { error }) => ({ ...state, loading: false, error })),

	// Mark paid by uid (single payment)
	on(CommissionPaymentsActions.markCommissionPaymentPaidByUid, (state) => ({ ...state, loading: true, error: null })),
	on(CommissionPaymentsActions.markCommissionPaymentPaidByUidSuccess, (state, { uid, paidAt }) =>
		adapter.updateOne({ id: uid, changes: { paid: true, paidAt } }, { ...state, loading: false })),
	on(CommissionPaymentsActions.markCommissionPaymentPaidByUidFailure, (state, { error }) => ({ ...state, loading: false, error })),

	// Search actions
	on(CommissionPaymentsActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(CommissionPaymentsActions.clearCommissionPayments, () => initialState)
);
