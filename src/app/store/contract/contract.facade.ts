import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as ContractActions from './contract.actions';
import * as fromContract from './contract.selectors';
import { Contract } from './contract.model';

@Injectable({ providedIn: 'root' })
export class ContractFacade {
	contracts$ = this.store.select(fromContract.selectFiltered);
	selectedContract$ = this.store.select(fromContract.selectedContract);
	loading$ = this.store.select(fromContract.selectLoading);
	search$ = this.store.select(fromContract.selectSearch);
	total$ = this.store.select(fromContract.selectTotal);

	constructor(private store: Store) {}

	loadContracts() {
		this.store.dispatch(ContractActions.loadContracts());
	}

	selectContract(contract: Contract) {
		this.store.dispatch(ContractActions.selectContract({ contract }));
	}

	createContract(contract: Contract) {
		this.store.dispatch(ContractActions.createContract({ contract }));
	}

	updateContract(contract: Contract) {
		this.store.dispatch(ContractActions.updateContract({ contract }));
	}

	deleteContract(uid: string) {
		this.store.dispatch(ContractActions.deleteContract({ uid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(ContractActions.setSearchTerm({ searchTerm }));
	}
}
