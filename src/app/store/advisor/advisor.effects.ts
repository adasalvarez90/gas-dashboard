import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, withLatestFrom } from 'rxjs/operators';

import * as AdvisorActions from './advisor.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { AdvisorFirestoreService } from 'src/app/services/advisor-firestore.service';
import { AuthFacade } from '../auth/auth.facade';


@Injectable()
export class AdvisorEffects {
	constructor(
		private actions$: Actions,
		private advisorFS: AdvisorFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load advisors
	loadAdvisors$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.loadAdvisors),
			withLatestFrom(this.authFacade.user$),
			switchMap(([_, user]) =>
				this.advisorFS.getAdvisors().then(
					advisors => AdvisorActions.loadAdvisorsSuccess({ advisors }),
					err => AdvisorActions.loadAdvisorsFailure({ error: err.message }),
				),
			),
		),
	);

	loadAdvisorsOnLogin$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AuthActions.loginSuccess),
			map(() => AdvisorActions.loadAdvisors()),
		),
	);

	// ➕ Create advisor
	createAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.createAdvisor),
			exhaustMap(
				async ({ advisor }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando consultora. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La consultora "${advisor.name}" fue creada con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.advisorFS.createAdvisor(advisor).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return AdvisorActions.createAdvisorSuccess({ advisor })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear la consultora "${advisor.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return AdvisorActions.createAdvisorFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update advisor
	updateAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.updateAdvisor),
			exhaustMap(
				async ({ advisor }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando consultora. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La consultora "${advisor.name}" fue editada con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.advisorFS.updateAdvisor(advisor).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return AdvisorActions.updateAdvisorSuccess({ advisor })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar la consultora "${advisor.name}": ${err.message}`;
							// Present the toast
							toast.present();

							return AdvisorActions.updateAdvisorFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete advisor
	deleteAdvisor$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AdvisorActions.deleteAdvisor),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando consultora. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `La consultora fue eliminada con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.advisorFS.deleteAdvisor(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return AdvisorActions.deleteAdvisorSuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar la consultora: ${err.message}`;
							// Present the toast
							toast.present();

							return AdvisorActions.deleteAdvisorFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
