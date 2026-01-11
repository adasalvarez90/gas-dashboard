import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import * as AuthActions from './auth.actions';
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service.ts';
import { exhaustMap, map } from 'rxjs';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private firebaseAuth: FirebaseAuthService
  ) {}

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        this.firebaseAuth
          .login(email, password)
          .then((user) => {
            return AuthActions.loginSuccess({ user });
          })
          .catch((error) => AuthActions.loginFailure({ error }))
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      exhaustMap(() =>
        this.firebaseAuth.logout().then(() => AuthActions.logoutSuccess())
      )
    )
  );

  session$ = createEffect(() =>
    this.firebaseAuth.authState$().pipe(
      map((user) => {
        return AuthActions.sessionUpdated({ user });
      })
    )
  );
}
