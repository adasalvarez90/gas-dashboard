import { AuthEffects } from '../auth/auth.effects';
import { filter } from 'rxjs/operators';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, adapter } from './contract.state';
import * as fromAuth from 'src/app/store/auth';

// Store state functions
import { match } from '../store.state';

export const selectors = createFeatureSelector<State>('contracts');

export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);

export const selectSearchTerm = createSelector(selectors, (state) => state.searchTerm);
export const selectStatusFilter = createSelector(selectors, (state) => state.statusFilter);

export const selectSearchFiltered = createSelector(
	selectAll,
	selectSearchTerm,
	(entities, search) => entities.filter(entity => match(entity, search))
);

export const selectFiltered = createSelector(
	selectSearchFiltered,
	selectStatusFilter,
	(entities, statusFilter) => entities.filter(entity => entity.contractStatus === statusFilter)
);

export const selectStatusCounts = createSelector(selectSearchFiltered, (entities) => {
	const counts = {
		PENDING: 0,
		ACTIVE: 0,
		FINISHED: 0,
		CANCELLED: 0,
	};

	for (const c of entities) {
		if (c.contractStatus in counts) {
			counts[c.contractStatus] += 1;
		}
	}

	return counts;
});

export const selectedContract = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);

export const selectSearch = createSelector(selectors, (state) => state.searchTerm);
