import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';
import * as AuthActions from './auth.actions';
import { switchMap } from 'rxjs/operators';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private authService: FirebaseAuthService
  ) {}

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      switchMap(({ email, password }) =>
        this.authService.login(email, password).then(
          (user) => AuthActions.loginSuccess({ user }),
          (error) => AuthActions.loginFailure({ error })
        )
      )
    )
  );

  /** LOGIN CON GOOGLE */
  loginWithGoogle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.loginWithGoogle),
      switchMap(() =>
        this.authService.loginWithGoogle().then(
          (user) => AuthActions.loginSuccess({ user }),
          (error) => AuthActions.loginFailure({ error })
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.logout),
      switchMap(() =>
        this.authService.logout().then(
          () => AuthActions.loginSuccess({ user: null }),
          (error) => AuthActions.loginFailure({ error })
        )
      )
    )
  );
}
