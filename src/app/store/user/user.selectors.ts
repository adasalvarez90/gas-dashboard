import { AuthEffects } from './../auth/auth.effects';
import { filter } from 'rxjs/operators';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State } from './user.state';
import * as fromAuth from 'src/app/store/auth';

// Store state functions
import { match } from '../store.state';

export const selectors = createFeatureSelector<State>('users');

export const selectSearchTerm = createSelector(selectors, (state) => state.searchTerm);

export const selectUsers = createSelector(
	selectors,
	fromAuth.selectors.selectUser,
	selectSearchTerm,
	(state, currentUser, search) => {
		const users = state.list;
		let filteredUsers = [];
		// Filter users based on current user's role
		if (currentUser) {
			if (currentUser.role === 0) {
				// Dev can see all users
				filteredUsers = users;
			} else if (currentUser.role === 1 || currentUser.role === 2) {
				// Admin can see Admins and Users
				filteredUsers = users.filter((user) => user.role >= 1);
			}
		}

		// Filter by search
		const filtered = filteredUsers.filter(entity => match(entity, search));
		
		return filtered;
	},
);

export const selectedUser = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);

export const selectSearch = createSelector(selectors, (state) => state.searchTerm);
