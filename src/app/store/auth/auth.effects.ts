import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';
import * as AuthActions from './auth.actions';
import { exhaustMap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private authService: FirebaseAuthService
  ) {}

  // LOGIN
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        from(this.authService.login(email, password)).pipe(
          map((user) => AuthActions.loginSuccess({ user })),
          catchError((error) =>
            of(AuthActions.loginFailure({ error: error.message }))
          )
        )
      )
    )
  );

  // LOGOUT
  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      exhaustMap(() =>
        from(this.authService.logout()).pipe(
          map(() => AuthActions.logoutSuccess()),
          catchError((error) =>
            of(AuthActions.logoutFailure({ error: error.message }))
          )
        )
      )
    )
  );
}
