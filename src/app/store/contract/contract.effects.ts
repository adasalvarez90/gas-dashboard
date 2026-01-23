import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { exhaustMap, switchMap, map, catchError, withLatestFrom } from 'rxjs/operators';
import { from, of } from 'rxjs';

import * as ContractActions from './contract.actions';
import * as AuthActions from '../auth/auth.actions';
import { ContractFirestoreService } from 'src/app/services/contract-firestore.service';
import { AuthFacade } from '../auth/auth.facade';
import { Contract } from './contract.model';

@Injectable()
export class ContractEffects {
	constructor(
		private actions$: Actions,
		private contractFS: ContractFirestoreService,
		private authFacade: AuthFacade,
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
			exhaustMap(({ contract }) =>
				this.contractFS.createContract(contract).then(
					() => ContractActions.createContractSuccess({ contract }),
					(err) => ContractActions.createContractFailure({ error: err.message }),
				),
			),
		),
	);

	// ✏️ Update contract
	updateContract$ = createEffect(() =>
		this.actions$.pipe(
			ofType(ContractActions.updateContract),
			exhaustMap(({ contract }) =>
				this.contractFS.updateContract(contract).then(
					() => ContractActions.updateContractSuccess({ contract }),
					(err) => ContractActions.updateContractFailure({ error: err.message }),
				),
			),
		),
	);

	// 🗑️ Delete contract
	deleteContract$ = createEffect(() =>
		this.actions$.pipe(
			ofType(ContractActions.deleteContract),
			exhaustMap(({ uid }) =>
				this.contractFS.deleteContract(uid).then(
					() => ContractActions.deleteContractSuccess({ uid }),
					(err) => ContractActions.deleteContractFailure({ error: err.message }),
				),
			),
		),
	);
}
