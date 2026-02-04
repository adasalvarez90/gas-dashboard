import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { from, of } from 'rxjs';

import * as UserActions from './user.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { UserFirestoreService } from 'src/app/services/user-firestore.service';
import { AuthFacade } from '../auth/auth.facade';
import { User } from './user.model';

@Injectable()
export class UserEffects {
	constructor(
		private actions$: Actions,
		private userFS: UserFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

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
			exhaustMap(
				async ({ user }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando usuario. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.name}" fue creado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.userFS.createUser(user).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return UserActions.createUserSuccess({ user })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear el usuario "${user.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return UserActions.createUserFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update user
	updateUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(UserActions.updateUser),
			exhaustMap(
				async ({ user }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando usuario. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.name}" fue editado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.userFS.updateUser(user).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return UserActions.updateUserSuccess({ user })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar el usuario "${user.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return UserActions.updateUserFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete user
	deleteUser$ = createEffect(() =>
		this.actions$.pipe(
			ofType(UserActions.deleteUser),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando usuario. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario fue eliminado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.userFS.deleteUser(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return UserActions.deleteUserSuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar el usuario: ${err.message}`;
							// Present the toast
							toast.present();

							return UserActions.deleteUserFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
