import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './commission-payment.state';
import * as CommissionPaymentsActions from './commission-payment.actions';

export const commissionPaymentReducer = createReducer(
	initialState,

	on(CommissionPaymentsActions.loadCommissionPayments, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsSuccess, (state, { commissionPayments }) => adapter.setAll(commissionPayments, { ...state, selected: null, loading: false })),

	on(CommissionPaymentsActions.loadCommissionPaymentsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionPaymentsActions.selectCommissionPayment, (state, { commissionPayment }) => ({ ...state, selected: commissionPayment, })),

	on(CommissionPaymentsActions.createCommissionPaymentSuccess, (state, { commissionPayments }) => adapter.addMany(commissionPayments, state)),

	// Search actions
	on(CommissionPaymentsActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(CommissionPaymentsActions.clearCommissionPayments, () => initialState)
);
