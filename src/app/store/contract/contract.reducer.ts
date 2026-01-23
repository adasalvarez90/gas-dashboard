import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './contract.state';
import * as ContractsActions from './contract.actions';

export const contractReducer = createReducer(
	initialState,

	on(ContractsActions.loadContracts, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(ContractsActions.loadContractsSuccess, (state, { contracts }) => adapter.setAll(contracts, { ...state, selected: null, loading: false })),

	on(ContractsActions.loadContractsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(ContractsActions.selectContract, (state, { contract }) => ({ ...state, selected: contract, })),

	on(ContractsActions.createContractSuccess, (state, { contract }) => adapter.addOne(contract, state)),

	on(ContractsActions.updateContractSuccess, (state, { contract }) => adapter.updateOne({ id: contract.uid, changes: contract, }, { ...state, selected: contract, loading: false, })),

	on(ContractsActions.deleteContractSuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(ContractsActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(ContractsActions.clearContracts, () => initialState)
);
