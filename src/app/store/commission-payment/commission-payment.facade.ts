import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';
import * as CommissionPaymentActions from './commission-payment.actions';
import * as fromCommissionPayment from './commission-payment.selectors';
import { CommissionPayment } from './commission-payment.model';

@Injectable({ providedIn: 'root' })
export class CommissionPaymentFacade {
	commissionPayments$ = this.store.select(fromCommissionPayment.selectFiltered);
	selectedCommissionPayment$ = this.store.select(fromCommissionPayment.selectedCommissionPayment);
	loading$ = this.store.select(fromCommissionPayment.selectLoading);
	search$ = this.store.select(fromCommissionPayment.selectSearch);
	total$ = this.store.select(fromCommissionPayment.selectTotal);

	constructor(private store: Store) {}

	loadCommissionPayments(contractUid: string, advisorUid: string) {
		this.store.dispatch(CommissionPaymentActions.loadCommissionPayments({ contractUid, advisorUid }));
	}

	selectCommissionPayment(commissionPayment: CommissionPayment) {
		this.store.dispatch(CommissionPaymentActions.selectCommissionPayment({ commissionPayment }));
	}

	createCommissionPayment(commissionPayment: CommissionPayment) {
		this.store.dispatch(CommissionPaymentActions.createCommissionPayment({ commissionPayment }));
	}

	updateCommissionPayment(commissionPayment: CommissionPayment) {
		this.store.dispatch(CommissionPaymentActions.updateCommissionPayment({ commissionPayment }));
	}

	deleteCommissionPayment(uid: string) {
		this.store.dispatch(CommissionPaymentActions.deleteCommissionPayment({ uid }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(CommissionPaymentActions.setSearchTerm({ searchTerm }));
	}
}
