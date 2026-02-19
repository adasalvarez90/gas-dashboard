import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, withLatestFrom } from 'rxjs/operators';

import * as DepositActions from './deposit.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { DepositFirestoreService } from 'src/app/services/deposit-firestore.service';
import { AuthFacade } from '../auth/auth.facade';

@Injectable()
export class DepositEffects {
	constructor(
		private actions$: Actions,
		private depositFS: DepositFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load deposits
	loadDeposits$ = createEffect(() =>
		this.actions$.pipe(
			ofType(DepositActions.loadDeposits),
			withLatestFrom(this.authFacade.user$),
			switchMap(([{ contractUid }, user]) =>
				this.depositFS.getDeposits(contractUid).then(
					deposits => DepositActions.loadDepositsSuccess({ deposits }),
					err => DepositActions.loadDepositsFailure({ error: err.message }),
				),
			),
		),
	);

	// ➕ Create deposit
	createDeposit$ = createEffect(() =>
		this.actions$.pipe(
			ofType(DepositActions.createDeposit),
			exhaustMap(
				async ({ deposit }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando deposito. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El deposito de "${deposit.amount}" fue creado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.depositFS.createDeposit(deposit).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return DepositActions.createDepositSuccess({ deposit: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear el deposito de "${deposit.amount}": ${err.message}`;
							// Present the toast
							toast.present();

							return DepositActions.createDepositFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update deposit
	updateDeposit$ = createEffect(() =>
		this.actions$.pipe(
			ofType(DepositActions.updateDeposit),
			exhaustMap(
				async ({ deposit }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando deposito. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El deposito de "${deposit.amount}" fue editado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.depositFS.updateDeposit(deposit).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return DepositActions.updateDepositSuccess({ deposit: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar el deposito de "${deposit.amount}": ${err.message}`;
							// Present the toast
							toast.present();

							return DepositActions.updateDepositFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete deposit
	deleteDeposit$ = createEffect(() =>
		this.actions$.pipe(
			ofType(DepositActions.deleteDeposit),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando deposito. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El deposito fue eliminado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.depositFS.deleteDeposit(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return DepositActions.deleteDepositSuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar el deposito: ${err.message}`;
							// Present the toast
							toast.present();

							return DepositActions.deleteDepositFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
