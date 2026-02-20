import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './commission-payment.state';
import * as CommissionPaymentsActions from './commission-payment.actions';

export const commissionPaymentReducer = createReducer(
	initialState,

	on(CommissionPaymentsActions.loadCommissionPayments, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionPaymentsActions.loadCommissionPaymentsSuccess, (state, { commissionPayments }) => adapter.setAll(commissionPayments, { ...state, selected: null, loading: false })),

	on(CommissionPaymentsActions.loadCommissionPaymentsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionPaymentsActions.selectCommissionPayment, (state, { commissionPayment }) => ({ ...state, selected: commissionPayment, })),

	on(CommissionPaymentsActions.createCommissionPaymentSuccess, (state, { commissionPayment }) => adapter.addOne(commissionPayment, state)),

	on(CommissionPaymentsActions.updateCommissionPaymentSuccess, (state, { commissionPayment }) => adapter.updateOne({ id: commissionPayment.uid, changes: commissionPayment, }, { ...state, selected: commissionPayment, loading: false, })),

	on(CommissionPaymentsActions.deleteCommissionPaymentSuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(CommissionPaymentsActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(CommissionPaymentsActions.clearCommissionPayments, () => initialState)
);
