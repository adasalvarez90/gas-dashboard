import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as CommissionPolicyActions from './commission-policy.actions';
import * as fromCommissionPolicy from './commission-policy.selectors';
import { CommissionPolicy } from './commission-policy.model';

@Injectable({ providedIn: 'root' })
export class CommissionPolicyFacade {
	/** Catálogo completo (sin filtro de búsqueda del listado legacy). */
	allCommissionPolicies$ = this.store.select(fromCommissionPolicy.selectAll);
	commissionPolicies$ = this.store.select(fromCommissionPolicy.selectFiltered);
	selectedCommissionPolicy$ = this.store.select(fromCommissionPolicy.selectedCommissionPolicy);
	loading$ = this.store.select(fromCommissionPolicy.selectLoading);
	search$ = this.store.select(fromCommissionPolicy.selectSearch);
	total$ = this.store.select(fromCommissionPolicy.selectTotal);

	constructor(private store: Store) {}

	loadCommissionPolicies() {
		this.store.dispatch(CommissionPolicyActions.loadCommissionPolicies());
	}

	selectCommissionPolicy(commissionPolicy: CommissionPolicy) {
		this.store.dispatch(CommissionPolicyActions.selectCommissionPolicy({ commissionPolicy }));
	}

	createCommissionPolicy(commissionPolicy: CommissionPolicy) {
		this.store.dispatch(CommissionPolicyActions.createCommissionPolicy({ commissionPolicy }));
	}

	updateCommissionPolicy(commissionPolicy: CommissionPolicy) {
		this.store.dispatch(CommissionPolicyActions.updateCommissionPolicy({ commissionPolicy }));
	}

	deleteCommissionPolicy(uid: string) {
		this.store.dispatch(CommissionPolicyActions.deleteCommissionPolicy({ uid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(CommissionPolicyActions.setSearchTerm({ searchTerm }));
	}
}
