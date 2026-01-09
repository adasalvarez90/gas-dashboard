// Libraries
import { createReducer, on, ActionReducer } from '@ngrx/store';
// Actions
import * as actions from './auth.actions';
import * as _ from 'lodash';
// State
import { State, initialState } from './auth.state';
/**
 * DEFINE THE REDUCER METHODS
 */
// Create the reducer
const _reducer: ActionReducer<State> = createReducer(
	initialState,
	// Entity reducers
	on(actions.sessionUpdated, (state: State, { auth }) => _.assign(_.clone(state), { ...auth, ...{ loaded: true } })),
	on(actions.sessionFailed, (state: State) => _.assign(_.clone(state), { loaded: true })),
	on(actions.loginSuccess, (state: State, { auth }) => _.assign(_.clone(state), auth)),
	on(actions.logError, (state: State, { error }) => _.assign(_.clone(state), { error })),
	on(actions.logoutSuccess, (state: State, { auth }) => _.assign(_.clone(state), auth)),
	on(actions.setModule, (state: State, { module }) => _.assign(_.clone(state), { module })),
);

// Create the reducer function
export function reducer(state, action) {
	//
	return _reducer(state, action);
}
