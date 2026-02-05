import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as CommissionActions from './commission.actions';
import * as fromCommission from './commission.selectors';
import { Commission } from './commission.model';

@Injectable({ providedIn: 'root' })
export class CommissionFacade {
	commissions$ = this.store.select(fromCommission.selectAll);
	entities$ = this.store.select(fromCommission.selectEntities);
	selectedCommission$ = this.store.select(fromCommission.selectedCommission);
	loading$ = this.store.select(fromCommission.selectLoading);

	constructor(private store: Store) { }

	loadCommissions() {
		this.store.dispatch(CommissionActions.loadCommissions());
	}

	selectCommission(commission: Commission) {
		this.store.dispatch(CommissionActions.selectCommission({ commission }));
	}

	upsertManyCommissions(commissions: {
		role: string;
		source: string;
		percentage: number;
	}[]) {
		this.store.dispatch(CommissionActions.upsertManyCommissions({ commissions }));
	}
}
