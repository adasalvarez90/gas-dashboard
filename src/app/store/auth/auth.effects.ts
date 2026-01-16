import { Router } from '@angular/router';
import { Injectable } from '@angular/core';
import * as AuthActions from './auth.actions';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { LoadingController, ToastController } from '@ionic/angular';
//Rxjs
import { exhaustMap } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { map, tap, take, catchError } from 'rxjs/operators';
// Services
import { FirebaseAuthService } from 'src/app/services/firebase-auth.service';
import { UserFirestoreService } from 'src/app/services/user-firestore.service';

@Injectable()
export class AuthEffects {
  constructor(
    private router: Router,
    private actions$: Actions,
    private authService: FirebaseAuthService,
    private userFS: UserFirestoreService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  // LOGIN
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.login),
      exhaustMap(({ email, password }) =>
        from(this.authService.login(email, password)).pipe(
          exhaustMap(async (fbUser) => {
            // Create the loading
            const loading = await this.loadingCtrl.create({
              cssClass: 'my-custom-class',
              message: 'Iniciando sesión. Espere, por favor.',
            });

            // Create the toast
            const toast = await this.toastCtrl.create({
              color: 'primary',
              message: '',
              duration: 5000,
              position: 'middle',
              cssClass: 'toast-auth',
            });

            // Define the try catch block
            try {
              // Present the loading
              await loading.present();
              const user = await this.userFS.getUser(fbUser.uid);

              if (!user) {
                console.error('User not registered in Firestore');

                throw {
                  error: {
                    message:
                      'Usuario no registrado. Contacte al administrador.',
                  },
                };
              }

              // Modified the toast message
              toast.message = `¡Bienvenid@! ${user.name}`;
              // Hide the loading
              await loading.dismiss();
              // Show the toast
              await toast.present();
              // Initialize session
              // setTimeout(() => location.reload(), 2000);
              // Return the success action
              return AuthActions.loginSuccess({ user });
              // In case of error
            } catch (error: any) {
              // Dismiss the loading
              await loading.dismiss();
              // Change the toast message and show it
              toast.message = `${error.error.message}`;
              // Present the toast
              toast.present();
              // dispatch the create error
              return AuthActions.loginFailure({
                error: error.message,
              });
            }
          }),
          catchError((error) =>
            of(AuthActions.loginFailure({ error: error.message }))
          )
        )
      )
    )
  );

  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.loginSuccess),
        tap(() => this.router.navigate(['/dashboard']))
      ),
    { dispatch: false }
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

  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(AuthActions.logoutSuccess),
        tap(() => this.router.navigate(['/login']))
      ),
    { dispatch: false }
  );

  restoreSession$ = createEffect(() =>
    this.actions$.pipe(
      ofType(AuthActions.restoreSession),
      exhaustMap(() =>
        this.authService.authState$().pipe(
          take(1),
          exhaustMap(async (fbUser) => {

            if (!fbUser) {
              return AuthActions.restoreSessionFailure();
            }

            try {
              const user = await this.userFS.getUser(fbUser.uid);

              if (!user) {
                return AuthActions.restoreSessionFailure();
              }

              return AuthActions.restoreSessionSuccess({ user });
            } catch (error) {
              console.error('Restore session error:', error);
              return AuthActions.restoreSessionFailure();
            }
          })
        )
      )
    )
  );
}
