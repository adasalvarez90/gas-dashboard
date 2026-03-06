import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as CommissionPaymentActions from './commission-payment.actions';
import * as fromCommissionPayment from './commission-payment.selectors';

import { CommissionPayment } from './commission-payment.model';
import { CommissionPaymentDraft } from 'src/app/models/commission-engine.model';

@Injectable({ providedIn: 'root' })
export class CommissionPaymentFacade {
	commissionPayments$ = this.store.select(fromCommissionPayment.selectFiltered);
	selectedCommissionPayment$ = this.store.select(fromCommissionPayment.selectedCommissionPayment);
	loading$ = this.store.select(fromCommissionPayment.selectLoading);
	search$ = this.store.select(fromCommissionPayment.selectSearch);
	total$ = this.store.select(fromCommissionPayment.selectTotal);

	constructor(private store: Store) {}

	loadCommissionPayments(trancheUid: string) {
		this.store.dispatch(CommissionPaymentActions.loadCommissionPayments({ trancheUid }));
	}

	selectCommissionPayment(commissionPayment: CommissionPayment) {
		this.store.dispatch(CommissionPaymentActions.selectCommissionPayment({ commissionPayment }));
	}

	createCommissionPayment(commissionPayments: CommissionPaymentDraft[]) {
		this.store.dispatch(CommissionPaymentActions.createManyCommissionPayment({ commissionPayments }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(CommissionPaymentActions.setSearchTerm({ searchTerm }));
	}
}
