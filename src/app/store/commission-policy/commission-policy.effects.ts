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
						message: 'Guardando dinámica especial…'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La dinámica "${commissionPolicy.name}" se creó correctamente.`,
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
							toast.message = `No se pudo crear la dinámica "${commissionPolicy.name}": ${err.message}`;
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
						message: 'Guardando dinámica especial…'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La dinámica "${commissionPolicy.name}" se actualizó correctamente.`,
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
							toast.message = `No se pudo actualizar la dinámica "${commissionPolicy.name}": ${err.message}`;
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
						message: 'Eliminando dinámica…'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La dinámica se eliminó del catálogo.`,
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
							toast.message = `No se pudo eliminar la dinámica: ${err.message}`;
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
