import { createFeatureSelector, createSelector } from '@ngrx/store';
import { inviteAdapter, InviteState } from './invite.reducer';

export const INVITES_FEATURE_KEY = 'invites';

export const selectInviteState =
  createFeatureSelector<InviteState>(INVITES_FEATURE_KEY);

const { selectAll, selectEntities } =
  inviteAdapter.getSelectors();

export const selectAllInvites = createSelector(
  selectInviteState,
  selectAll,
);

export const selectInviteEntities = createSelector(
  selectInviteState,
  selectEntities,
);

export const selectInvitesLoading = createSelector(
  selectInviteState,
  state => state.loading,
);
