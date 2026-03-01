import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './commission-policy.state';
import * as CommissionPoliciesActions from './commission-policy.actions';

export const commissionPolicyReducer = createReducer(
	initialState,

	on(CommissionPoliciesActions.loadCommissionPolicies, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionPoliciesActions.loadCommissionPoliciesSuccess, (state, { commissionPolicies }) => adapter.setAll(commissionPolicies, { ...state, selected: null, loading: false })),

	on(CommissionPoliciesActions.loadCommissionPoliciesFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionPoliciesActions.selectCommissionPolicy, (state, { commissionPolicy }) => ({ ...state, selected: commissionPolicy, })),

	on(CommissionPoliciesActions.createCommissionPolicySuccess, (state, { commissionPolicy }) => adapter.addOne(commissionPolicy, state)),

	on(CommissionPoliciesActions.updateCommissionPolicySuccess, (state, { commissionPolicy }) => adapter.updateOne({ id: commissionPolicy.uid, changes: commissionPolicy, }, { ...state, selected: commissionPolicy, loading: false, })),

	on(CommissionPoliciesActions.deleteCommissionPolicySuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(CommissionPoliciesActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(CommissionPoliciesActions.clearCommissionPolicies, () => initialState)
);
