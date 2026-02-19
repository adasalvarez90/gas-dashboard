import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, adapter } from './commission-config.state';

// Store state functions
import { match } from '../store.state';
import { CommissionConfig } from './commission-config.model';

export const selectors = createFeatureSelector<State>('commissionConfigs');

export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);

export const selectedCommissionConfig = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);
