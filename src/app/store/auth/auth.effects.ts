import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { LoadingController, ToastController } from '@ionic/angular';
import { catchError, exhaustMap, map, tap } from 'rxjs/operators';
import { of } from 'rxjs';

import * as actions from './auth.actions';
import { AuthService } from './auth.service';

@Injectable()
export class AuthEffects {

  constructor(
    private actions$: Actions,
    private authService: AuthService,
    private loadingCtrl: LoadingController,
    private toastCtrl: ToastController
  ) {}

  // -----------------------
  // LOGIN
  // -----------------------
  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.login),
      exhaustMap(({ username, password }) => {

        return this.authService.login(username, password).pipe(

          map(auth => actions.loginSuccess({ auth })),

          catchError((error) =>
            of(
              actions.logError({
                error: {
                  message: 'Ocurrió un error al iniciar sesión.',
                  payload: { username },
                  time: Date.now(),
                  error
                }
              })
            )
          )
        );
      })
    )
  );

  // -----------------------
  // LOGIN SUCCESS (UI)
  // -----------------------
  loginSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.loginSuccess),
        tap(async ({ auth }) => {
          const toast = await this.toastCtrl.create({
            color: 'primary',
            message: `¡Bienvenid@, ${auth.user?.name || 'usuario'}!`,
            duration: 3000,
            position: 'middle'
          });

          await toast.present();

          setTimeout(() => location.reload(), 1500);
        })
      ),
    { dispatch: false }
  );

  // -----------------------
  // LOGOUT
  // -----------------------
  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(actions.logout),
      exhaustMap(() =>
        this.authService.logout().pipe(
          map(() => actions.logoutSuccess({ auth: null })),
          catchError(error =>
            of(
              actions.logError({
                error: {
                  message: 'Ocurrió un error al cerrar sesión.',
                  time: Date.now(),
                  payload: null,
                  error
                }
              })
            )
          )
        )
      )
    )
  );

  // -----------------------
  // LOGOUT SUCCESS
  // -----------------------
  logoutSuccess$ = createEffect(
    () =>
      this.actions$.pipe(
        ofType(actions.logoutSuccess),
        tap(async () => {
          const toast = await this.toastCtrl.create({
            color: 'primary',
            message: 'Sesión cerrada correctamente.',
            duration: 2000,
            position: 'middle'
          });

          await toast.present();
          setTimeout(() => location.reload(), 1500);
        })
      ),
    { dispatch: false }
  );
}
