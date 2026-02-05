import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './commission.state';
import * as CommissionsActions from './commission.actions';

export const commissionReducer = createReducer(
	initialState,

	on(CommissionsActions.loadCommissions, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(CommissionsActions.loadCommissionsSuccess, (state, { commissions }) => adapter.setAll(commissions, { ...state, selected: null, loading: false })),

	on(CommissionsActions.loadCommissionsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(CommissionsActions.selectCommission, (state, { commission }) => ({ ...state, selected: commission, })),

	on(CommissionsActions.upsertManyCommissionsSuccess, (state, { commissions }) => adapter.upsertMany(commissions, state)),

	on(CommissionsActions.clearCommissions, () => initialState)
);
