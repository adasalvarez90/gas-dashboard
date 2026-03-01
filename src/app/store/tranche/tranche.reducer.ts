import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './tranche.state';
import * as TranchesActions from './tranche.actions';

export const trancheReducer = createReducer(
	initialState,

	on(TranchesActions.loadTranches, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(TranchesActions.loadTranchesSuccess, (state, { tranches }) => adapter.setAll(tranches, { ...state, selected: null, loading: false })),

	on(TranchesActions.loadTranchesFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(TranchesActions.selectTranche, (state, { tranche }) => ({ ...state, selected: tranche, })),

	on(TranchesActions.createTrancheSuccess, (state, { tranche }) => adapter.addOne(tranche, state)),

	on(TranchesActions.updateTrancheSuccess, (state, { tranche }) => adapter.updateOne({ id: tranche.uid, changes: tranche, }, { ...state, selected: tranche, loading: false, })),

	on(TranchesActions.deleteTrancheSuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(TranchesActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(TranchesActions.clearTranches, () => initialState)
);
