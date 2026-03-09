import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as ContractActions from './contract.actions';
import * as fromContract from './contract.selectors';
import { Contract, ContractStatus } from './contract.model';

@Injectable({ providedIn: 'root' })
export class ContractFacade {
	// NOTE: keep this as "search filtered" (used across pages like Metrics)
	contracts$ = this.store.select(fromContract.selectSearchFiltered);
	contractsByStatus$ = this.store.select(fromContract.selectFiltered);
	selectedContract$ = this.store.select(fromContract.selectedContract);
	loading$ = this.store.select(fromContract.selectLoading);
	search$ = this.store.select(fromContract.selectSearch);
	total$ = this.store.select(fromContract.selectTotal);
	statusFilter$ = this.store.select(fromContract.selectStatusFilter);
	statusCounts$ = this.store.select(fromContract.selectStatusCounts);

	constructor(private store: Store) {}

	loadContracts() {
		this.store.dispatch(ContractActions.loadContracts());
	}

	selectContract(contract: Contract) {
		this.store.dispatch(ContractActions.selectContract({ contract }));
	}

	createContractWithInitialTranche(contract: Contract, initialCapital: number) {
		this.store.dispatch(ContractActions.createContractWithInitialTranche({ contract, initialCapital }));
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

	setStatusFilter(statusFilter: ContractStatus) {
		this.store.dispatch(ContractActions.setStatusFilter({ statusFilter }));
	}
}
