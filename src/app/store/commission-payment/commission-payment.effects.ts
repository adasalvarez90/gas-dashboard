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

	// 🔎 Load commissionPayments by contract (all tranches)
	loadCommissionPaymentsByContract$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.loadCommissionPaymentsByContract),
			withLatestFrom(this.authFacade.user$),
			switchMap(([{ contractUid }, user]) =>
				this.commissionPaymentFS.getCommissionPaymentsByContract(contractUid).then(
					commissionPayments => CommissionPaymentActions.loadCommissionPaymentsByContractSuccess({ commissionPayments }),
					err => CommissionPaymentActions.loadCommissionPaymentsByContractFailure({ error: err.message }),
				),
			),
		),
	);

	// 🔎 Load commissionPayments by cutDate
	loadCommissionPaymentsByCutDate$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.loadCommissionPaymentsByCutDate),
			withLatestFrom(this.authFacade.user$),
			switchMap(([{ cutDate }, user]) =>
				this.commissionPaymentFS.getCommissionPaymentsByCutDate(cutDate).then(
					commissionPayments => CommissionPaymentActions.loadCommissionPaymentsByCutDateSuccess({ commissionPayments }),
					err => CommissionPaymentActions.loadCommissionPaymentsByCutDateFailure({ error: err.message }),
				),
			),
		),
	);

	// 🔎 Load commissionPayments for cuts (date range)
	// Sin withLatestFrom(user$): la ruta Commission Cuts pasa guards, ya hay usuario.
	// withLatestFrom bloqueaba si user$ no emitía a tiempo (p. ej. lazy load).
	loadCommissionPaymentsForCuts$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.loadCommissionPaymentsForCuts),
			switchMap(({ startCutDate, endCutDate }) =>
				this.commissionPaymentFS.getCommissionPaymentsByCutDateRange(startCutDate, endCutDate).then(
					commissionPayments => CommissionPaymentActions.loadCommissionPaymentsForCutsSuccess({ commissionPayments }),
					err => CommissionPaymentActions.loadCommissionPaymentsForCutsFailure({ error: err.message }),
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

	// ✅ Mark as paid by cutDate + advisor (Commission Cuts page)
	markCommissionPaymentsPaidByCutDateAndAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.markCommissionPaymentsPaidByCutDateAndAdvisor),
			exhaustMap(async ({ cutDate, advisorUid, paidAt }) => {
				const resolvedPaidAt = paidAt ?? Date.now();
				const loading = await this.loadingCtrl.create({
					cssClass: 'my-custom-class',
					message: 'Marcando comisiones del asesor como pagadas…',
				});
				await loading.present();
				return this.commissionPaymentFS.markCommissionPaymentsPaidByCutDateAndAdvisor(cutDate, advisorUid, resolvedPaidAt).then(
					async (updatedCount) => {
						await loading.dismiss();
						const toast = await this.toastCtrl.create({
							color: 'primary',
							message: `Se marcaron ${updatedCount} pago(s) del asesor como pagados.`,
							duration: 3000,
							position: 'middle',
						});
						await toast.present();
						return CommissionPaymentActions.markCommissionPaymentsPaidByCutDateAndAdvisorSuccess({
							cutDate,
							advisorUid,
							paidAt: resolvedPaidAt,
							updatedCount,
						});
					},
					async (err) => {
						await loading.dismiss();
						const toast = await this.toastCtrl.create({
							color: 'danger',
							message: `Error: ${err.message}`,
							duration: 3000,
							position: 'middle',
						});
						await toast.present();
						return CommissionPaymentActions.markCommissionPaymentsPaidByCutDateAndAdvisorFailure({ error: err.message });
					},
				);
			}),
		),
	);

	// ✅ Mark as paid by tranche + advisor
	markCommissionPaymentsPaidByTrancheAndAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.markCommissionPaymentsPaidByTrancheAndAdvisor),
			exhaustMap(async ({ trancheUid, advisorUid, paidAt }) => {
				const resolvedPaidAt = paidAt ?? Date.now();
				const loading = await this.loadingCtrl.create({
					cssClass: 'my-custom-class',
					message: 'Marcando pagos del asesor como pagados…'
				});
				await loading.present();
				return this.commissionPaymentFS.markCommissionPaymentsPaidByTrancheAndAdvisor(trancheUid, advisorUid, resolvedPaidAt).then(
					async (updatedCount) => {
						await loading.dismiss();
						const toast = await this.toastCtrl.create({
							color: 'primary',
							message: `Se marcaron ${updatedCount} pago(s) del asesor como pagados.`,
							duration: 3000,
							position: 'middle'
						});
						await toast.present();
						return CommissionPaymentActions.markCommissionPaymentsPaidByTrancheAndAdvisorSuccess({ trancheUid, advisorUid, paidAt: resolvedPaidAt, updatedCount });
					},
					async (err) => {
						await loading.dismiss();
						const toast = await this.toastCtrl.create({
							color: 'danger',
							message: `Error: ${err.message}`,
							duration: 3000,
							position: 'middle'
						});
						await toast.present();
						return CommissionPaymentActions.markCommissionPaymentsPaidByTrancheAndAdvisorFailure({ error: err.message });
					},
				);
			}),
		),
	);

	// ➕ Create adjustment commissionPayment
	createAdjustmentCommissionPayment$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPaymentActions.createAdjustmentCommissionPayment),
			exhaustMap(async ({ adjustment }) => {
				const loading = await this.loadingCtrl.create({
					cssClass: 'my-custom-class',
					message: 'Creando ajuste de comisión. Espere, por favor.'
				});

				await loading.present();

				return this.commissionPaymentFS.createAdjustmentCommissionPayment(adjustment).then(
					async (commissionPayment) => {
						await loading.dismiss();
						const toast = await this.toastCtrl.create({
							color: 'primary',
							message: `El ajuste por "${commissionPayment.amount}" fue creado con éxito.`,
							duration: 3000,
							position: 'middle'
						});
						await toast.present();
						return CommissionPaymentActions.createAdjustmentCommissionPaymentSuccess({ commissionPayment });
					},
					async (err) => {
						await loading.dismiss();
						const toast = await this.toastCtrl.create({
							color: 'danger',
							message: `Error al crear el ajuste: ${err.message}`,
							duration: 3000,
							position: 'middle'
						});
						await toast.present();
						return CommissionPaymentActions.createAdjustmentCommissionPaymentFailure({ error: err.message });
					},
				);
			}),
		),
	);
}
