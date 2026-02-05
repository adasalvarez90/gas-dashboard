import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, adapter } from './commission.state';

// Store state functions
import { match } from '../store.state';
import { Commission } from './commission.model';

export const selectors = createFeatureSelector<State>('commissions');

export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);

export const selectedCommission = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);
