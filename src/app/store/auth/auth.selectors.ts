import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State } from './auth.state';

export const selectors = createFeatureSelector<State>('auth');
export const selectAuth = createSelector(selectors, (state: State) => state);
export const selectUser = createSelector(selectors, (state: State) => state.user);
export const selectLoading = createSelector(selectors, (state: State) => state.loading);
export const selectError = createSelector(selectors, (state: State) => state.error);
