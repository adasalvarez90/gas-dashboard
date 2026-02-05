import { AuthEffects } from '../auth/auth.effects';
import { filter } from 'rxjs/operators';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, adapter } from './advisor.state';

// Store state functions
import { match } from '../store.state';
import { Advisor } from './advisor.model';

export const selectors = createFeatureSelector<State>('advisors');

export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);

export const selectSearchTerm = createSelector(selectors, (state) => state.searchTerm);

export const selectFiltered = createSelector(selectAll, selectSearchTerm, (entities, search) => entities.filter(entity => match(entity, search)));

export const selectManagers = createSelector(selectAll, (entities) => entities.filter(entity => entity.hierarchyLevel === 'MANAGER'));
export const selectManagersEntities = createSelector(selectAll, (entities) => {
	const managers = entities.filter(entity => entity.hierarchyLevel === 'MANAGER');
	const managersEntities: { [key: string]: Advisor } = {};
	managers.forEach(manager => {
		managersEntities[manager.uid] = manager;
	});
	return managersEntities;
});

export const selectedAdvisor = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);

export const selectSearch = createSelector(selectors, (state) => state.searchTerm);
