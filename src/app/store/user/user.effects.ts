// Libraries
import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { catchError, exhaustMap, map } from 'rxjs/operators';
import { EMPTY, lastValueFrom } from 'rxjs';
// Actions
import * as actions from './user.actions';
import { UserService } from './user.service';
import { LoadingController, ToastController } from '@ionic/angular';

@Injectable()
export class UserEffects {
	//
	constructor(
		private actions$: Actions,
		private userService: UserService,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }
	// //
	// public query$ = createEffect(() =>
	// 	this.actions$
	// 		.pipe(
	// 			// ofType(actions.query),
	// 			exhaustMap(() => this.userService.getActions()),
	// 		)
	// );
	//
	public create$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.create),
				map(action => action.user),
				exhaustMap(async user => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando usuario. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.get('name')}" fue creado con éxito.`,
						duration: 2000,
						position: 'middle'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get created
						// await lastValueFrom(this.userService.createApi(user));
						// Hide the loading
						await loading.dismiss();
						// Show the toast
						await toast.present();
						// Return the success action
						return actions.createSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Change the toast message and show it
						toast.message = 'ERROR. Su usuario no pudo ser creado. Intente de nuevo, por favor.';
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al crear el usuario.',
								payload: user,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
	//
	public update$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.update),
				map(action => action.user),
				exhaustMap(async user => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando usuario. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.get('name')}" fue editado con éxito.`,
						duration: 3000,
						position: 'middle'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get updated
						// await lastValueFrom(this.userService.updateApi(user));
						// Hide the loading
						await loading.dismiss();
						// Show the toast
						await toast.present();
						// Return the update success
						return actions.updateSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Change the toast message and show it
						toast.message = error && error.error && error.error.message ? `ERROR. ${error.error.message}` :
							'ERROR. Su usuario no pudo ser editado. Intente de nuevo, por favor.';
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al editar el usuario.',
								payload: user,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
	//
	public updatePermissions$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.updatePermissions),
				map(action => action.user),
				exhaustMap(async user => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando usuario. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.name}" fue editado con éxito.`,
						duration: 2000,
						position: 'middle'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get updated
						// await lastValueFrom(this.userService.update(user));
						// Hide the loading
						await loading.dismiss();
						// Show the toast
						await toast.present();
						// Return the update success
						return actions.updateSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Change the toast message and show it
						toast.message = 'ERROR. Su usuario no pudo ser editado. Intente de nuevo, por favor.';
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al editar el usuario.',
								payload: user,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
	//
	public changePassword$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.changePassword),
				map(action => action.user),
				exhaustMap(async user => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Enviando nueva contraseña. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.name}" tiene una nueva contraseña y ha sido enviada.`,
						duration: 2000,
						position: 'middle'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get updated
						// await lastValueFrom(this.userService.changePassword(user));
						// Hide the loading
						await loading.dismiss();
						// Show the toast
						await toast.present();
						// Return the update success
						return actions.updateSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Change the toast message and show it
						toast.message = `ERROR. La nueva contraseña de ${user.name} no pudo ser creada. Intente de nuevo, por favor.`;
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al crear una nueva contraseña el usuario.',
								payload: user,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
	//
	public remove$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.remove),
				map(action => action.user),
				exhaustMap(async user => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Borrando usuario. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.name}" fue borrado con éxito.`,
						duration: 2000,
						position: 'middle'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get created
						// await lastValueFrom(this.userService.remove(user._code));
						// Hide the loading
						await loading.dismiss();
						// Show the toast
						await toast.present();
						// Return the update success
						return actions.updateSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Change the toast message and show it
						toast.message = 'ERROR. Su usuario no pudo ser borrado. Intente de nuevo, por favor.';
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al borrar el usuario.',
								payload: user,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
	//
	public recovery$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.recovery),
				map(action => action.username),
				exhaustMap(async username => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Enviando mensaje de validación. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `Se envió un mensaje de validación al usuario "${username}".`,
						duration: 2000,
						position: 'middle'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get updated
						// await lastValueFrom(this.userService.recovery(username));
						// Hide the loading
						await loading.dismiss();
						// Show the toast
						await toast.present();
						// Return the update success
						return actions.updateSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Change the toast message and show it
						toast.message = `ERROR. El mensaje de validación para ${username} no pudo ser enviado. Intente de nuevo, por favor.`;
						// Chanhe the toast duration
						toast.duration = 5000;
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al enviar el mensaje de validación.',
								payload: username,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
	//
	public selectByToken$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.selectByToken),
				map(action => action.token),
				exhaustMap(async token => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Obteniendo información. Espere, por favor.'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get updated
						// const userBytoken = await lastValueFrom(this.userService.selectByToken(token));
						// Hide the loading
						await loading.dismiss();
						// Return the update success
						// return actions.selectByTokenSuccess({ user: userBytoken });
						return actions.updateSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Create the toast
						const toast = await this.toastCtrl.create({
							color: 'primary',
							message: `ERROR. La información no pudo ser obtenida. Intente de nuevo, por favor.`,
							duration: 2000,
							position: 'middle'
						});
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al obtener información.',
								payload: token,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
	//
	public newPassword$ = createEffect(() =>
		this.actions$
			.pipe(
				ofType(actions.newPassword),
				map(action => action.user),
				exhaustMap(async user => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Enviando nueva contraseña. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El usuario "${user.name}" tiene una nueva contraseña y ha sido enviada.`,
						duration: 2000,
						position: 'middle'
					});
					// Define the try catch block
					try {
						// Present the loading
						await loading.present();
						// Wait for the user to get updated
						// await lastValueFrom(this.userService.newPassword(user));
						// Hide the loading
						await loading.dismiss();
						// Show the toast
						await toast.present();
						// Return the update success
						return actions.updateSuccess();
						// In case of error
					} catch (error: any) {
						// Dismiss the loading
						await loading.dismiss();
						// Change the toast message and show it
						toast.message = `ERROR. La nueva contraseña de ${user.name} no pudo ser creada. Intente de nuevo, por favor.`;
						// Present the toast
						toast.present();
						// dispatch the create error
						return actions.createError({
							error: {
								message: 'Ocurrió un error al crear una nueva contraseña el usuario.',
								payload: user,
								time: Date.now(),
								error
							}
						});
					}
				}),
				catchError(() => EMPTY)
			)
	);
}
