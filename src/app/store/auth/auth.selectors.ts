// Libraries
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State } from './auth.state';
// Get the auths
export const selectors = createFeatureSelector<State>('auth');
// Selectors
export const selectAuth = createSelector(selectors, (state: State) => state);
export const selectModule = createSelector(selectors, (state: State) => state.module);
