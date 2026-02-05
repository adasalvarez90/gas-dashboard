import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, withLatestFrom, tap } from 'rxjs/operators';

import * as CommissionActions from './commission.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { CommissionFirestoreService } from 'src/app/services/commission-firestore.service';
import { AuthFacade } from '../auth/auth.facade';


@Injectable()
export class CommissionEffects {
	constructor(
		private actions$: Actions,
		private commissionFS: CommissionFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load commissions
	loadCommissions$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionActions.loadCommissions),
			withLatestFrom(this.authFacade.user$),
			switchMap(([_, user]) =>
				this.commissionFS.getCommissions().then(
					commissions => CommissionActions.loadCommissionsSuccess({ commissions }),
					err => CommissionActions.loadCommissionsFailure({ error: err.message }),
				),
			),
		),
	);

	loadCommissionsOnLogin$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AuthActions.loginSuccess),
			map(() => CommissionActions.loadCommissions()),
		),
	);


	upsertMany$ = createEffect(() =>
		this.actions$.pipe(
			ofType(CommissionActions.upsertManyCommissions),
			exhaustMap(
				async ({ commissions }) => {
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
						position: 'middle'
					});

					// Present the loading
					await loading.present();
					
					return this.commissionFS.upsertMany(commissions).then(
						async (res) => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return CommissionActions.upsertManyCommissionsSuccess({ commissions: res })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar las comisiones: ${err.message}`;
							// Present the toast
							toast.present();

							return CommissionActions.upsertManyCommissionsFailure({ error: err })
						}
					)
				}
			)
		)
	);
}
