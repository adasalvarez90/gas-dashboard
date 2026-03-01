import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, withLatestFrom } from 'rxjs/operators';

import * as TrancheActions from './tranche.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { TrancheFirestoreService } from 'src/app/services/tranche-firestore.service';
import { AuthFacade } from '../auth/auth.facade';

@Injectable()
export class TrancheEffects {
	constructor(
		private actions$: Actions,
		private trancheFS: TrancheFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load tranches
	loadTranches$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TrancheActions.loadTranches),
			withLatestFrom(this.authFacade.user$),
			switchMap(([{ contractUid }, user]) =>
				this.trancheFS.getTranches(contractUid).then(
					tranches => TrancheActions.loadTranchesSuccess({ tranches }),
					err => TrancheActions.loadTranchesFailure({ error: err.message }),
				),
			),
		),
	);

	// ➕ Create tranche
	createTranche$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TrancheActions.createTranche),
			exhaustMap(
				async ({ tranche }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando tramo. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El tramo de "${tranche.capital}" fue creado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.trancheFS.createTranche(tranche).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return TrancheActions.createTrancheSuccess({ tranche: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear el tramo de "${tranche.capital}": ${err.message}`;
							// Present the toast
							toast.present();

							return TrancheActions.createTrancheFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update tranche
	updateTranche$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TrancheActions.updateTranche),
			exhaustMap(
				async ({ tranche }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando tramo. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El tramo de "${tranche.capital}" fue editado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.trancheFS.updateTranche(tranche).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return TrancheActions.updateTrancheSuccess({ tranche: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar el tramo de "${tranche.capital}": ${err.message}`;
							// Present the toast
							toast.present();

							return TrancheActions.updateTrancheFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete tranche
	deleteTranche$ = createEffect(() =>
		this.actions$.pipe(
			ofType(TrancheActions.deleteTranche),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando tramo. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El tramo fue eliminado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.trancheFS.deleteTranche(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return TrancheActions.deleteTrancheSuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar el tramo: ${err.message}`;
							// Present the toast
							toast.present();

							return TrancheActions.deleteTrancheFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
