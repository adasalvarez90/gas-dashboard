import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './commission-config.state';
import * as CommissionConfigsActions from './commission-config.actions';

export const commissionConfigReducer = createReducer(
	initialState,

	on(CommissionConfigsActions.loadCommissionConfigs, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionConfigsActions.loadCommissionConfigsSuccess, (state, { commissionConfigs }) => adapter.setAll(commissionConfigs, { ...state, selected: null, loading: false })),

	on(CommissionConfigsActions.loadCommissionConfigsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionConfigsActions.selectCommissionConfig, (state, { commissionConfig }) => ({ ...state, selected: commissionConfig, })),

	on(CommissionConfigsActions.upsertManyCommissionConfigsSuccess, (state, { commissionConfigs }) => adapter.upsertMany(commissionConfigs, state)),

	on(CommissionConfigsActions.clearCommissionConfigs, () => initialState)
);
