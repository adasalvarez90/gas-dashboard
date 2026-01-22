import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, adapter } from './invite.state';

// Store state functions
import { match } from '../store.state';


export const selectors = createFeatureSelector<State>('invites');

export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);



export const selectSearch = createSelector(selectors, (state) => state.searchTerm);

export const selectFiltered = createSelector(selectAll, selectSearch, (invites, search) => invites);

export const selectedInvite = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);

export const selectInvitesWithComputedFlags = createSelector(
	selectors,
	selectAll,
	(_, invites) =>
		invites.map(invite => {
			const now = Date.now();

			const isExpired =
				invite.status === 'expired' || now > invite.expiresAt;

			const isNearExpiration =
				!isExpired &&
				invite.expiresAt - now < 1000 * 60 * 60 * 24; // 24h

			return {
				...invite,
				isExpired,
				isNearExpiration
			};
		})
);