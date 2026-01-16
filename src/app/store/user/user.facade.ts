import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as UserActions from './user.actions';
import * as fromUser from './user.selectors';
import { User } from './user.model';

@Injectable({ providedIn: 'root' })
export class UserFacade {
  users$ = this.store.select(fromUser.selectAllFiltered);
  selected$ = this.store.select(fromUser.selectSelectedUser);
  loading$ = this.store.select(fromUser.selectLoading);
  search$ = this.store.select(fromUser.selectSearch);
  total$ = this.store.select(fromUser.selectTotal);

  constructor(private store: Store) {}

  loadUsers() {
    this.store.dispatch(UserActions.loadUsers());
  }

  selectUser(user: User) {
    this.store.dispatch(UserActions.selectUser({ user }));
  }

  createUser(user: User) {
    this.store.dispatch(UserActions.createUser({ user }));
  }

  updateUser(user: User) {
    this.store.dispatch(UserActions.updateUser({ user }));
  }

  deleteUser(uid: string) {
    this.store.dispatch(UserActions.deleteUser({ uid }));
  }

  searchText(searchTerm: string) {
    this.store.dispatch(UserActions.setSearchTerm({ searchTerm }));
  }
}
