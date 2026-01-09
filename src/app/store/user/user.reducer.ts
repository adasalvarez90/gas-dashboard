// Libraries
import { createReducer, on, ActionReducer } from '@ngrx/store';
// Actions
import * as actions from './user.actions';
import * as _ from 'lodash';
// State
import { State, adapter, initialState } from './user.state';
/**
 * DEFINE THE REDUCER METHODS
 */
// Create the reducer
const _reducer: ActionReducer<State> = createReducer(
	initialState,
	// Entity reducers
	on(actions.addAll, (state: State, { users }) => {
		// Merge the new state
		state = _.assign(_.cloneDeep(state), { loaded: true });
		// Add all the users
		return adapter.setAll(users, state);
	}),
	on(actions.select, (state: State, { id }) => {
		return {...state, ...{ selectedUserId: id }};
	}),
	on(actions.created, (state: State, { user }) => adapter.addOne(user, state)),
	on(actions.updated, (state: State, { user }) => adapter.updateOne(user, state)),
	on(actions.deleted, (state: State, { id }) => adapter.removeOne(id, state)),
	// Search actions
	on(actions.searchText, (state: State, { search }) => _.assign(_.cloneDeep(state), { search })),
	// Errors
	on(actions.createError, (state: State, { error }) => _.assign(_.cloneDeep(state), { error })),
	on(actions.updateError, (state: State, { error }) => _.assign(_.cloneDeep(state), { error })),
	on(actions.removeError, (state: State, { error }) => _.assign(_.cloneDeep(state), { error })),
	// Select by token
	on(actions.selectByTokenSuccess, (state: State, { user }) => _.assign(_.cloneDeep(state), { userByToken: user })),
);

// Create the reducer function
export function reducer(state, action) {
	//
	return _reducer(state, action);
}