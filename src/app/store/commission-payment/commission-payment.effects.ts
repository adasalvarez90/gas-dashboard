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
import { CommissionPayment } from './commission-payment.model';

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
			switchMap(([{ trancheUid }, user]) =>
				this.commissionPaymentFS.getCommissionPayments(trancheUid).then(
					commissionPayments => CommissionPaymentActions.loadCommissionPaymentsSuccess({ commissionPayments }),
					err => CommissionPaymentActions.loadCommissionPaymentsFailure({ error: err.message }),
				),
			),
		),
	);

	// ➕ Create commissionPayment
	createManyCommissionPayment$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.createManyCommissionPayment),
			exhaustMap(
				async ({ commissionPayments }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando pago. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El pago de "${commissionPayments.map(p => p.amount).join(', ')}" fue creado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.commissionPaymentFS.createManyCommissionPayment(commissionPayments).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionPaymentActions.createCommissionPaymentSuccess({ commissionPayments: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear el pago de "${commissionPayments.map(p => p.amount).join(', ')}": ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionPaymentActions.createCommissionPaymentFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
