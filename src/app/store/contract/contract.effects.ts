import { Injectable } from '@angular/core';
import { LoadingController, ToastController } from '@ionic/angular';
//NgRx
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, withLatestFrom } from 'rxjs/operators';

import * as ContractActions from './contract.actions';
import * as AuthActions from '../auth/auth.actions';
// Services
import { ContractFirestoreService } from 'src/app/services/contract-firestore.service';
import { AuthFacade } from '../auth/auth.facade';

@Injectable()
export class ContractEffects {
	constructor(
		private actions$: Actions,
		private contractFS: ContractFirestoreService,
		private authFacade: AuthFacade,
		private loadingCtrl: LoadingController,
		private toastCtrl: ToastController,
	) { }

	// 🔎 Load contracts
	loadContracts$ = createEffect(() =>
		this.actions$.pipe(
			ofType(ContractActions.loadContracts),
			withLatestFrom(this.authFacade.user$),
			switchMap(([_, user]) =>
				this.contractFS.getContracts().then(
					contracts => ContractActions.loadContractsSuccess({ contracts }),
					err => ContractActions.loadContractsFailure({ error: err.message }),
				),
			),
		),
	);

	loadContractsOnLogin$ = createEffect(() =>
		this.actions$.pipe(
			ofType(AuthActions.loginSuccess),
			map(() => ContractActions.loadContracts()),
		),
	);

	// ➕ Create contract
	createContract$ = createEffect(() =>
		this.actions$.pipe(
			ofType(ContractActions.createContract),
			exhaustMap(
				async ({ contract }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Creando contrato. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El contrato de "${contract.investor}" fue creado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.contractFS.createContract(contract).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return ContractActions.createContractSuccess({ contract })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al crear el contrato de "${contract.investor}": ${err.message}`;
							// Present the toast
							toast.present();

							return ContractActions.createContractFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// ✏️ Update contract
	updateContract$ = createEffect(() =>
		this.actions$.pipe(
			ofType(ContractActions.updateContract),
			exhaustMap(
				async ({ contract }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Editando contrato. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El contrato de "${contract.investor}" fue editado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.contractFS.updateContract(contract).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return ContractActions.updateContractSuccess({ contract })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al editar el contrato de "${contract.investor}": ${err.message}`;
							// Present the toast
							toast.present();

							return ContractActions.updateContractFailure({ error: err.message })
						},
					)
				},
			),
		),
	);

	// 🗑️ Delete contract
	deleteContract$ = createEffect(() =>
		this.actions$.pipe(
			ofType(ContractActions.deleteContract),
			exhaustMap(
				async ({ uid }) => {
					// Create the loading
					const loading = await this.loadingCtrl.create({
						cssClass: 'my-custom-class',
						message: 'Eliminando contrato. Espere, por favor.'
					});
					// Create the toast
					const toast = await this.toastCtrl.create({
						color: 'primary',
						message: `El contrato fue eliminado con éxito.`,
						duration: 3000,
						position: 'middle'
					});

					// Present the loading
					await loading.present();

					return this.contractFS.deleteContract(uid).then(
						async () => {
							// Hide the loading
							await loading.dismiss();
							// Show the toast
							await toast.present();

							return ContractActions.deleteContractSuccess({ uid })
						},
						async (err) => {
							await loading.dismiss();
							// Change the toast message and show it
							toast.message = `Error al eliminar el contrato: ${err.message}`;
							// Present the toast
							toast.present();

							return ContractActions.deleteContractFailure({ error: err.message })
						},
					)
				},
			),
		),
	);
}
