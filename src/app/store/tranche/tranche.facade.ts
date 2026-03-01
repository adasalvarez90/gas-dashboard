import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as TrancheActions from './tranche.actions';
import * as fromTranche from './tranche.selectors';
import { Tranche } from './tranche.model';

@Injectable({ providedIn: 'root' })
export class TrancheFacade {
	tranches$ = this.store.select(fromTranche.selectFiltered);
	selectedTranche$ = this.store.select(fromTranche.selectedTranche);
	loading$ = this.store.select(fromTranche.selectLoading);
	search$ = this.store.select(fromTranche.selectSearch);
	total$ = this.store.select(fromTranche.selectTotal);

	constructor(private store: Store) {}

	loadTranches(contractUid: string) {
		this.store.dispatch(TrancheActions.loadTranches({ contractUid }));
	}

	selectTranche(tranche: Tranche) {
		this.store.dispatch(TrancheActions.selectTranche({ tranche }));
	}

	createTranche(tranche: Tranche) {
		this.store.dispatch(TrancheActions.createTranche({ tranche }));
	}

	updateTranche(tranche: Tranche) {
		this.store.dispatch(TrancheActions.updateTranche({ tranche }));
	}

	deleteTranche(uid: string) {
		this.store.dispatch(TrancheActions.deleteTranche({ uid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(TrancheActions.setSearchTerm({ searchTerm }));
	}
}
