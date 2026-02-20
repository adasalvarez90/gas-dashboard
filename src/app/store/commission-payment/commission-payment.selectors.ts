import { AuthEffects } from '../auth/auth.effects';
import { filter } from 'rxjs/operators';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State, adapter } from './commission-payment.state';
import * as fromAuth from 'src/app/store/auth';

// Store state functions
import { match } from '../store.state';

export const selectors = createFeatureSelector<State>('commissionPayments');

export const {
	selectIds,
	selectAll,
	selectEntities,
	selectTotal
} = adapter.getSelectors(selectors);

export const selectSearchTerm = createSelector(selectors, (state) => state.searchTerm);

export const selectFiltered = createSelector(selectAll, selectSearchTerm, (entities, search) => entities.filter(entity => match(entity, search)));

export const selectedCommissionPayment = createSelector(selectors, (state) => state.selected);

export const selectLoading = createSelector(selectors, (state) => state.loading);

export const selectSearch = createSelector(selectors, (state) => state.searchTerm);
