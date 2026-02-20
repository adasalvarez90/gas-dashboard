import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as DepositActions from './deposit.actions';
import * as fromDeposit from './deposit.selectors';
import { Deposit } from './deposit.model';

@Injectable({ providedIn: 'root' })
export class DepositFacade {
	deposits$ = this.store.select(fromDeposit.selectFiltered);
	selectedDeposit$ = this.store.select(fromDeposit.selectedDeposit);
	loading$ = this.store.select(fromDeposit.selectLoading);
	search$ = this.store.select(fromDeposit.selectSearch);
	total$ = this.store.select(fromDeposit.selectTotal);

	constructor(private store: Store) {}

	loadDeposits(contractUid: string) {
		this.store.dispatch(DepositActions.loadDeposits({ contractUid }));
	}

	selectDeposit(deposit: Deposit) {
		this.store.dispatch(DepositActions.selectDeposit({ deposit }));
	}

	createDeposit(deposit: Deposit) {
		this.store.dispatch(DepositActions.createDeposit({ deposit }));
	}

	updateDeposit(deposit: Deposit) {
		this.store.dispatch(DepositActions.updateDeposit({ deposit }));
	}

	deleteDeposit(uid: string) {
		this.store.dispatch(DepositActions.deleteDeposit({ uid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(DepositActions.setSearchTerm({ searchTerm }));
	}
}
