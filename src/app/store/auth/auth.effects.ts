import { Injectable } from '@angular/core';
import * as AuthActions from './auth.actions';
import { Actions, createEffect, ofType } from '@ngrx/effects';
//Rxjs
import { exhaustMap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
// Models
import { User } from 'src/app/store/user/user.model';
// Services
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';
import { UserFirestoreService } from 'src/app/services/user-firestore.service';

@Injectable()
export class AuthEffects {
  constructor(
    private actions$: Actions,
    private authService: FirebaseAuthService,
    private userFS: UserFirestoreService
  ) {}

  // LOGIN
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        from(this.authService.login(email, password)).pipe(
          exhaustMap(async (fbUser) => {

            console.log('Firebase User UID:', fbUser.uid);

            const user = await this.userFS.getUser(fbUser.uid);

            if (!user) {
              console.error('User not registered in Firestore');

              return AuthActions.loginFailure({
                error: 'User is not registered in the system',
              });
            }

            return AuthActions.loginSuccess({ user });
          }),
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
