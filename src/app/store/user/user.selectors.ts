import { AuthEffects } from './../auth/auth.effects';
import { filter } from 'rxjs/operators';
import { createFeatureSelector, createSelector } from '@ngrx/store';
import { State } from './user.state';
import * as fromAuth from 'src/app/store/auth';

export const selectUsersState = createFeatureSelector<State>('users');

export const selectUsers = createSelector(
  selectUsersState,
  fromAuth.selectors.selectUser,
  (state, currentUser) => {
    const users = state.list;
    let filteredUsers = [];
    // Filter users based on current user's role
    if (currentUser) {
      if (currentUser.role === 0) {
        // Dev can see all users
        filteredUsers = users;
      } else if (currentUser.role === 1 || currentUser.role === 2) {
        // Admin can see Admins and Users
        filteredUsers = users.filter((user) => user.role >= 1);
      }
    }

    return filteredUsers;
  },
);

export const selectSelectedUser = createSelector(
  selectUsersState,
  (state) => state.selected,
);

export const selectLoading = createSelector(
  selectUsersState,
  (state) => state.loading,
);

export const selectSearch = createSelector(
  selectUsersState,
  (state) => state.searchTerm,
);
