import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, withLatestFrom } from 'rxjs/operators';

import * as TagActions from './tag.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { TagFirestoreService } from 'src/app/services/tag-firestore.service';
import { AuthFacade } from '../auth/auth.facade';

@Injectable()
export class TagEffects {
	constructor(
		private actions$: Actions,
		private tagFS: TagFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load tags
	loadTags$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TagActions.loadTags),
			withLatestFrom(this.authFacade.user$),
			switchMap(([_, user]) =>
				this.tagFS.getTags().then(
					tags => TagActions.loadTagsSuccess({ tags }),
					err => TagActions.loadTagsFailure({ error: err.message }),
				),
			),
		),
	);

	loadTagsOnLogin$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AuthActions.loginSuccess),
			map(() => TagActions.loadTags()),
		),
	);

	// ➕ Create tag
	createTag$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TagActions.createTag),
			exhaustMap(
				async ({ tag }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando rol. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El rol "${tag.name}" fue creado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.tagFS.createTag(tag).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return TagActions.createTagSuccess({ tag })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear el rol "${tag.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return TagActions.createTagFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update tag
	updateTag$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TagActions.updateTag),
			exhaustMap(
				async ({ tag }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando rol. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El rol "${tag.name}" fue editado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.tagFS.updateTag(tag).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return TagActions.updateTagSuccess({ tag })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar el rol "${tag.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return TagActions.updateTagFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete tag
	deleteTag$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TagActions.deleteTag),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando rol. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El rol fue eliminado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.tagFS.deleteTag(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return TagActions.deleteTagSuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar el rol: ${err.message}`;
							// Present the toast
							toast.present();

							return TagActions.deleteTagFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
