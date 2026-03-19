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

	loadCommissionPaymentsByContract(contractUid: string) {
		this.store.dispatch(CommissionPaymentActions.loadCommissionPaymentsByContract({ contractUid }));
	}

	loadCommissionPaymentsByCutDate(cutDate: number) {
		this.store.dispatch(CommissionPaymentActions.loadCommissionPaymentsByCutDate({ cutDate }));
	}

	loadCommissionPaymentsForCuts(startCutDate: number, endCutDate: number) {
		this.store.dispatch(CommissionPaymentActions.loadCommissionPaymentsForCuts({ startCutDate, endCutDate }));
	}

	selectCommissionPayment(commissionPayment: CommissionPayment) {
		this.store.dispatch(CommissionPaymentActions.selectCommissionPayment({ commissionPayment }));
	}

	createCommissionPayment(commissionPayments: CommissionPaymentDraft[]) {
		this.store.dispatch(CommissionPaymentActions.createManyCommissionPayment({ commissionPayments }));
	}

	markPaidByCutDate(cutDate: number, paidAt?: number) {
		this.store.dispatch(CommissionPaymentActions.markCommissionPaymentsPaidByCutDate({ cutDate, paidAt }));
	}

	markPaidByCutDateAndAdvisor(cutDate: number, advisorUid: string, paidAt?: number) {
		this.store.dispatch(CommissionPaymentActions.markCommissionPaymentsPaidByCutDateAndAdvisor({ cutDate, advisorUid, paidAt }));
	}

	markPaidByTrancheAndAdvisor(trancheUid: string, advisorUid: string, paidAt?: number) {
		this.store.dispatch(CommissionPaymentActions.markCommissionPaymentsPaidByTrancheAndAdvisor({ trancheUid, advisorUid, paidAt }));
	}

	markPaidByUid(uid: string, paidAt?: number) {
		this.store.dispatch(CommissionPaymentActions.markCommissionPaymentPaidByUid({ uid, paidAt }));
	}

	createAdjustment(adjustment: Parameters<typeof CommissionPaymentActions.createAdjustmentCommissionPayment>[0]['adjustment']) {
		this.store.dispatch(CommissionPaymentActions.createAdjustmentCommissionPayment({ adjustment }));
	}

	searchText(searchTerm: string) {
		this.store.dispatch(CommissionPaymentActions.setSearchTerm({ searchTerm }));
	}
}
