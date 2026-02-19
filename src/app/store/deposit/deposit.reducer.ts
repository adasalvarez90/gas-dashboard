import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './deposit.state';
import * as DepositsActions from './deposit.actions';

export const depositReducer = createReducer(
	initialState,

	on(DepositsActions.loadDeposits, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(DepositsActions.loadDepositsSuccess, (state, { deposits }) => adapter.setAll(deposits, { ...state, selected: null, loading: false })),

	on(DepositsActions.loadDepositsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(DepositsActions.selectDeposit, (state, { deposit }) => ({ ...state, selected: deposit, })),

	on(DepositsActions.createDepositSuccess, (state, { deposit }) => adapter.addOne(deposit, state)),

	on(DepositsActions.updateDepositSuccess, (state, { deposit }) => adapter.updateOne({ id: deposit.uid, changes: deposit, }, { ...state, selected: deposit, loading: false, })),

	on(DepositsActions.deleteDepositSuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(DepositsActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(DepositsActions.clearDeposits, () => initialState)
);
