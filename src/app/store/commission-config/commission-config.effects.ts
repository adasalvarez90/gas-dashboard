import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, withLatestFrom } from 'rxjs/operators';

import * as CommissionConfigActions from './commission-config.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { CommissionConfigFirestoreService } from 'src/app/services/commission-config-firestore.service';
import { AuthFacade } from '../auth/auth.facade';


@Injectable()
export class CommissionConfigEffects {
	constructor(
		private actions$: Actions,
		private commissionConfigFS: CommissionConfigFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load commissionConfigs
	loadCommissionConfigs$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionConfigActions.loadCommissionConfigs),
			withLatestFrom(this.authFacade.user$),
			switchMap(([_, user]) =>
				this.commissionConfigFS.getCommissionConfigs().then(
					commissionConfigs => CommissionConfigActions.loadCommissionConfigsSuccess({ commissionConfigs }),
					err => CommissionConfigActions.loadCommissionConfigsFailure({ error: err.message }),
				),
			),
		),
	);

	loadCommissionConfigsOnLogin$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AuthActions.loginSuccess),
			map(() => CommissionConfigActions.loadCommissionConfigs()),
		),
	);


	upsertMany$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionConfigActions.upsertManyCommissionConfigs),
			exhaustMap(
				async ({ commissionConfigs }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando comisiones. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `Las comisiones fueron editadas con éxito.`,
						duration: 3000,
						position: 'bottom'
					});

					// Present the loading
					await loading.present();
					
					return this.commissionConfigFS.upsertMany(commissionConfigs).then(
						async (res) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionConfigActions.upsertManyCommissionConfigsSuccess({ commissionConfigs: res })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar las comisiones: ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionConfigActions.upsertManyCommissionConfigsFailure({ error: err })
						}
					)
				}
			)
		)
	);
}
