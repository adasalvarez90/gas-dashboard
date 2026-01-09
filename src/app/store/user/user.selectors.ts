// Libraries
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { adapter, State } from './user.state';
// Stores
import * as fromRouter from '../router';
import * as fromAuth from '../auth';
// Store state functions
import { match } from '../store.state';
// Get the users
export const selectors = createFeatureSelector<State>('user');
// Get the selectors
export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);
// Selectors
export const selectLoaded = createSelector(selectors, (state: State) => state.loaded);
export const selectSearchText = createSelector(selectors, (state: State) => state.search);
export const selectedUserId = createSelector(selectors, (state: State) => state.selectedUserId);
export const selectedUser = createSelector(selectEntities, selectedUserId, (entities, id) => entities[id]);
// Router selectors
export const selectRouterUser = createSelector(selectEntities, fromRouter.selectors.selectRouteParams, (entities, params) => entities[params['id']]);
// Search
export const selectAllFiltered = createSelector(selectAll, fromAuth.selectors.selectAuth, selectSearchText, (entities, auth, search) => {
		// Filter by search
		const filtered = entities.filter(entity => match(entity, search));
		// sort by superAdmin and admin
		return filtered.sort((a, b) => {
			if (a.role === 0 && b.role !== 0) {
				return -1;
			}
			if (a.role !== 0 && b.role === 0) {
				return 1;
			}
			if (a.role === 1 && b.role !== 1) {
				return -1;
			}
			if (a.role !== 1 && b.role === 1) {
				return 1;
			}
			return 0;
		});
	});
// Merge selectors
export const selectAuthUser = createSelector(selectEntities, fromAuth.selectors.selectAuth, (entities, auth) => entities[auth.user._code]);

//
export const selectByCode = (code: number) => createSelector(selectEntities, (entities) => entities[code]);
