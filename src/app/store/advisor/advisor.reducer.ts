import { createReducer, on } from '@ngrx/store';

import { initialState, adapter } from './advisor.state';
import * as AdvisorsActions from './advisor.actions';

export const advisorReducer = createReducer(
	initialState,

	on(AdvisorsActions.loadAdvisors, (state) => ({ ...state, loading: true, selected: null, error: null, })),

	on(AdvisorsActions.loadAdvisorsSuccess, (state, { advisors }) => adapter.setAll(advisors, { ...state, selected: null, loading: false })),

	on(AdvisorsActions.loadAdvisorsFailure, (state, { error }) => ({ ...state, loading: false, selected: null, error, })),

	on(AdvisorsActions.selectAdvisor, (state, { advisor }) => ({ ...state, selected: advisor, })),

	on(AdvisorsActions.createAdvisorSuccess, (state, { advisor }) => adapter.addOne(advisor, { ...state, selected: advisor, loading: false, })),

	on(AdvisorsActions.updateAdvisorSuccess, (state, { advisor }) => adapter.updateOne({ id: advisor.uid, changes: advisor, }, { ...state, selected: advisor, loading: false, })),

	on(AdvisorsActions.deleteAdvisorSuccess, (state, { uid }) => adapter.removeOne(uid, { ...state, selected: state.selected?.uid === uid ? null : state.selected, loading: false, })),

	// Search actions
	on(AdvisorsActions.setSearchTerm, (state, { searchTerm }) => ({ ...state, searchTerm })),

	on(AdvisorsActions.clearAdvisors, () => initialState)
);
