import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, adapter } from './user.state';
import * as fromAuth from 'src/app/store/auth';

// Store state functions
import { match } from '../store.state';

export const selectors = createFeatureSelector<State>('users');

export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);

export const selectSearchTerm = createSelector(selectors, (state) => state.searchTerm);

export const selectFiltered = createSelector(
	selectAll,
	fromAuth.selectors.selectUser,
	selectSearchTerm,
	(entities, currentUser, search) => {
		let users = [];
		// Filter users based on current user's role
		if (currentUser) {
			if (currentUser.role === 0) {
				// Dev can see all users
				users = entities;
			} else if (currentUser.role === 1 || currentUser.role === 2) {
				// Admin can see Admins and Users
				users = entities.filter((user) => user.role >= 1);
			}
		}

		// Filter by search
		const filtered = users.filter(entity => match(entity, search));
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
	},
);

export const selectedUser = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);

export const selectSearch = createSelector(selectors, (state) => state.searchTerm);
