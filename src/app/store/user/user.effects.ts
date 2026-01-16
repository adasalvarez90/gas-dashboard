import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { of } from 'rxjs';

import * as UserActions from './user.actions';
import { UserFirestoreService } from 'src/app/services/user-firestore.service';
import { AuthFacade } from '../auth/auth.facade';
import { User } from './user.model';

@Injectable()
export class UserEffects {

  constructor(
    private actions$: Actions,
    private userFS: UserFirestoreService,
    private authFacade: AuthFacade
  ) {}

  // 🔎 Load users
  loadUsers$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.loadUsers),
      withLatestFrom(this.authFacade.user$),
      exhaustMap(([_, currentUser]) =>
        this.userFS.getUsersByRole(currentUser as User).then(
          users => UserActions.loadUsersSuccess({ users }),
          err => UserActions.loadUsersFailure({ error: err.message })
        )
      )
    )
  );

  // ➕ Create user
  createUser$ = createEffect(() =>
	this.actions$.pipe(
	  ofType(UserActions.createUser),
	  exhaustMap(({ user }) =>
		this.userFS.createUser(user).then(
		  () => UserActions.createUserSuccess({ user }),
		  err => UserActions.createUserFailure({ error: err.message })
		)
	  )
	)
  );

  // ✏️ Update user
  updateUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.updateUser),
      exhaustMap(({ user }) =>
        this.userFS.updateUser(user).then(
          () => UserActions.updateUserSuccess({ user }),
          err => UserActions.updateUserFailure({ error: err.message })
        )
      )
    )
  );

  // 🗑️ Delete user
  deleteUser$ = createEffect(() =>
    this.actions$.pipe(
      ofType(UserActions.deleteUser),
      exhaustMap(({ uid }) =>
        this.userFS.deleteUser(uid).then(
          () => UserActions.deleteUserSuccess({ uid }),
          err => UserActions.deleteUserFailure({ error: err.message })
        )
      )
    )
  );
}