import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, withLatestFrom } from 'rxjs/operators';

import * as CommissionPolicyActions from './commission-policy.actions';
// Services
import { CommissionPolicyFirestoreService } from 'src/app/services/commission-policy-firestore.service';
import { AuthFacade } from '../auth/auth.facade';

@Injectable()
export class CommissionPolicyEffects {
	constructor(
		private actions$: Actions,
		private commissionPolicyFS: CommissionPolicyFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load commissionPolicies
	loadCommissionPolicies$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPolicyActions.loadCommissionPolicies),
			withLatestFrom(this.authFacade.user$),
			switchMap(([{}, user]) =>
				this.commissionPolicyFS.getCommissionPolicies().then(
					commissionPolicies => CommissionPolicyActions.loadCommissionPoliciesSuccess({ commissionPolicies }),
					err => CommissionPolicyActions.loadCommissionPoliciesFailure({ error: err.message }),
				),
			),
		),
	);

	// ➕ Create commissionPolicy
	createCommissionPolicy$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPolicyActions.createCommissionPolicy),
			exhaustMap(
				async ({ commissionPolicy }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando políticas de comisiones. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La política de comisiones de "${commissionPolicy.name}" fue creada con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.commissionPolicyFS.createCommissionPolicy(commissionPolicy).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionPolicyActions.createCommissionPolicySuccess({ commissionPolicy: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear la política de comisiones de "${commissionPolicy.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionPolicyActions.createCommissionPolicyFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update commissionPolicy
	updateCommissionPolicy$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPolicyActions.updateCommissionPolicy),
			exhaustMap(
				async ({ commissionPolicy }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando políticas de comisiones. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La política de comisiones de "${commissionPolicy.name}" fue editada con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.commissionPolicyFS.updateCommissionPolicy(commissionPolicy).then(
						async (response) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionPolicyActions.updateCommissionPolicySuccess({ commissionPolicy: response })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar la política de comisiones de "${commissionPolicy.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionPolicyActions.updateCommissionPolicyFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete commissionPolicy
	deleteCommissionPolicy$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionPolicyActions.deleteCommissionPolicy),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando políticas de comisiones. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La política de comisiones fue eliminada con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.commissionPolicyFS.deleteCommissionPolicy(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionPolicyActions.deleteCommissionPolicySuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar la política de comisiones: ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionPolicyActions.deleteCommissionPolicyFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
