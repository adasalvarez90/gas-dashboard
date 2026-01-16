import { createFeatureSelector, createSelector } from '@ngrx/store';
import { adapter, State } from './user.state';

// Store state functions
import { match } from '../store.state';

export const selectUsersState = createFeatureSelector<State>('users');

export const { selectIds, selectAll, selectEntities, selectTotal } =
  adapter.getSelectors(selectUsersState);

export const selectUsers = createSelector(
  selectUsersState,
  (state) => state.list
);

export const selectSelectedUser = createSelector(
  selectUsersState,
  (state) => state.selected
);

export const selectLoading = createSelector(
  selectUsersState,
  (state) => state.loading
);

export const selectSearch = createSelector(
  selectUsersState,
  (state) => state.searchTerm
);

export const selectAllFiltered = createSelector(
  selectAll,
  selectSearch,
  (entities, searchTerm) => {
    // Declare filtered entities
    let users = entities;
    // Filter by search
    const filtered = users.filter((entity) => match(entity, searchTerm));
    // sort by superAdmin and admin
    return filtered.sort((a, b) => {
      if (a.role === 0 && b.role !== 0) {
        return -1;
      }
      if (a.role !== 0 && b.role === 0) {
        return 1;
      }
      if (a.role === 1 && b.role !== 1) {
        return -1;
      }
      if (a.role !== 1 && b.role === 1) {
        return 1;
      }
      return 0;
    });
  }
);
