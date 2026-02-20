import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, withLatestFrom } from 'rxjs/operators';
// Actions
import * as CommissionPaymentActions from './commission-payment.actions';
// Services
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';
import { AuthFacade } from '../auth/auth.facade';

@Injectable()
export class CommissionPaymentEffects {
	constructor(
		private actions$: Actions,
		private commissionPaymentFS: CommissionPaymentFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load commissionPayments
	loadCommissionPayments$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.loadCommissionPayments),
			withLatestFrom(this.authFacade.user$),
			switchMap(([{ contractUid, advisorUid }, user]) =>
				this.commissionPaymentFS.getCommissionPayments(contractUid, advisorUid).then(
					commissionPayments => CommissionPaymentActions.loadCommissionPaymentsSuccess({ commissionPayments }),
					err => CommissionPaymentActions.loadCommissionPaymentsFailure({ error: err.message }),
				),
			),
		),
	);

	// ➕ Create commissionPayment
	createCommissionPayment$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.createCommissionPayment),
			exhaustMap(
				async ({ commissionPayment }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando pago. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El pago de "${commissionPayment.amount}" fue creado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.commissionPaymentFS.createCommissionPayment(commissionPayment).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionPaymentActions.createCommissionPaymentSuccess({ commissionPayment: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear el pago de "${commissionPayment.amount}": ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionPaymentActions.createCommissionPaymentFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update commissionPayment
	updateCommissionPayment$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.updateCommissionPayment),
			exhaustMap(
				async ({ commissionPayment }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando pago. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El pago de "${commissionPayment.amount}" fue editado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.commissionPaymentFS.updateCommissionPayment(commissionPayment).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionPaymentActions.updateCommissionPaymentSuccess({ commissionPayment: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar el pago de "${commissionPayment.amount}": ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionPaymentActions.updateCommissionPaymentFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete commissionPayment
	deleteCommissionPayment$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.deleteCommissionPayment),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando pago. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El pago fue eliminado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.commissionPaymentFS.deleteCommissionPayment(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionPaymentActions.deleteCommissionPaymentSuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar el pago: ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionPaymentActions.deleteCommissionPaymentFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
