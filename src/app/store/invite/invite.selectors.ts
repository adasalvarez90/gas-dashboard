import { createFeatureSelector, createSelector } from '@ngrx/store';
import { inviteAdapter, InviteState } from './invite.reducer';
// Store state functions
import { match } from '../store.state';

export const INVITES_FEATURE_KEY = 'invites';

export const selectors = createFeatureSelector<InviteState>(INVITES_FEATURE_KEY);

const { selectAll, selectEntities, selectTotal } = inviteAdapter.getSelectors();

export const selectSearch = createSelector(selectors, (state) => state.searchTerm);

export const selectAllInvites = createSelector(selectors, selectAll);

export const selectFiltered = createSelector(selectAllInvites, selectSearch, (inivtes, search) => inivtes.filter(entity => match(entity, search)))

export const selectInviteEntities = createSelector(selectors, selectEntities);

export const selectInvitesLoading = createSelector(selectors, state => state.loading);

export const selectInvitesTotal = createSelector(selectors, selectTotal);
