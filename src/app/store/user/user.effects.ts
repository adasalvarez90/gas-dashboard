import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { from, of } from 'rxjs';

import * as UserActions from './user.actions';
import * as AuthActions from '../auth/auth.actions';
import { UserFirestoreService } from 'src/app/services/user-firestore.service';
import { AuthFacade } from '../auth/auth.facade';
import { User } from './user.model';

@Injectable()
export class UserEffects {
  constructor(
    private actions$: Actions,
    private userFS: UserFirestoreService,
    private authFacade: AuthFacade,
  ) {}

  // 🔎 Load users
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadUsers),
      withLatestFrom(this.authFacade.user$),
      switchMap(([_, currentUser]) => {
        return from(this.userFS.getUsersByRole(currentUser as User)).pipe(
          map((users) => UserActions.loadUsersSuccess({ users })),
          catchError((err) =>
            of(UserActions.loadUsersFailure({ error: err.message })),
          ),
        );
      }),
    ),
  );

  loadUsersOnLogin$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginSuccess),
      map(() => UserActions.loadUsers()),
    ),
  );

  // ➕ Create user
  createUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.createUser),
      exhaustMap(({ user }) =>
        this.userFS.createUser(user).then(
          () => UserActions.createUserSuccess({ user }),
          (err) => UserActions.createUserFailure({ error: err.message }),
        ),
      ),
    ),
  );

  // ✏️ Update user
  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateUser),
      exhaustMap(({ user }) =>
        this.userFS.updateUser(user).then(
          () => UserActions.updateUserSuccess({ user }),
          (err) => UserActions.updateUserFailure({ error: err.message }),
        ),
      ),
    ),
  );

  // 🗑️ Delete user
  deleteUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.deleteUser),
      exhaustMap(({ uid }) =>
        this.userFS.deleteUser(uid).then(
          () => UserActions.deleteUserSuccess({ uid }),
          (err) => UserActions.deleteUserFailure({ error: err.message }),
        ),
      ),
    ),
  );
}
