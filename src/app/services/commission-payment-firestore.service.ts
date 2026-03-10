import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where, writeBatch } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { v4 as uuidv4 } from 'uuid';
import { CommissionPaymentDraft } from '../models/commission-engine.model';

@Injectable({
	providedIn: 'root',
})
export class CommissionPaymentFirestoreService {
	private readonly collectionName = 'commissionPayments';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getCommissionPayments(trancheUid: string): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('trancheUid', '==', trancheUid), where('_on', '==', true));

		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPayment);
	}

	// ===== GET BY CONTRACT (all tranches) =====
	async getCommissionPaymentsByContract(contractUid: string): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('contractUid', '==', contractUid), where('_on', '==', true));

		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPayment);
	}

	// ===== GET BY CUT DATE =====
	async getCommissionPaymentsByCutDate(cutDate: number): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cutDate),
			where('_on', '==', true),
		);

		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPayment);
	}

	// ===== MARK PAID BY TRANCH + ADVISOR =====
	async markCommissionPaymentsPaidByTrancheAndAdvisor(trancheUid: string, advisorUid: string, paidAt: number = Date.now()): Promise<number> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('trancheUid', '==', trancheUid),
			where('advisorUid', '==', advisorUid),
			where('paid', '==', false),
			where('cancelled', '==', false),
			where('_on', '==', true),
		);

		const snap = await getDocs(q);
		const batch = writeBatch(this.firestore);

		snap.docs.forEach(d => {
			batch.update(d.ref, { paid: true, paidAt, _update: paidAt });
		});

		await batch.commit();
		return snap.size;
	}

	// ===== MARK PAID BY CUT DATE =====
	async markCommissionPaymentsPaidByCutDate(cutDate: number, paidAt: number = Date.now()): Promise<number> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('cutDate', '==', cutDate),
			where('paid', '==', false),
			where('cancelled', '==', false),
			where('_on', '==', true),
		);

		const snap = await getDocs(q);
		const batch = writeBatch(this.firestore);

		snap.docs.forEach(d => {
			batch.update(d.ref, { paid: true, paidAt, _update: paidAt });
		});

		await batch.commit();
		return snap.size;
	}

	// ===== MARK PAID BY UID (single payment) =====
	async markCommissionPaymentPaidByUid(uid: string, paidAt: number = Date.now()): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { paid: true, paidAt, _update: paidAt });
	}

	// ===== CANCEL FUTURE UNPAID BY CONTRACT =====
	async cancelFutureUnpaidByContract(contractUid: string, cancelledAt: number = Date.now()): Promise<number> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(
			ref,
			where('contractUid', '==', contractUid),
			where('paid', '==', false),
			where('_on', '==', true),
		);

		const snap = await getDocs(q);
		const batch = writeBatch(this.firestore);
		let updated = 0;

		snap.docs.forEach(d => {
			const payment = d.data() as CommissionPayment;
			if (payment.cancelled) return;
			if (payment.dueDate > cancelledAt) {
				updated++;
				batch.update(d.ref, { cancelled: true, _update: cancelledAt });
			}
		});

		await batch.commit();
		return updated;
	}

	// ➕ Create commissionPayment
	async createManyCommissionPayment(payments: CommissionPaymentDraft[]): Promise<CommissionPayment[]> {
		const createdPayments: CommissionPayment[] = [];

		for (const payment of payments) {

			const uid = uuidv4();

			const ref = doc(this.firestore, this.collectionName, uid);

			const newPayment = {
				...payment,
				uid,
				paid: false,
				cancelled: false,
				_create: Date.now(),
				_on: true
			};
			// Firestore does not support explicit `undefined` values.
			const cleanedPayment = _.omitBy(newPayment, _.isUndefined) as unknown as CommissionPayment;
			createdPayments.push(cleanedPayment);
			
			await setDoc(ref, cleanedPayment as any);
		}

		return createdPayments;
	}

	// ➕ Create adjustment commissionPayment (separate entry, never mutates paid payments)
	async createAdjustmentCommissionPayment(params: {
		contractUid: string;
		trancheUid: string;
		advisorUid: string;
		role: string;
		amount: number; // can be positive or negative
		dueDate: number;
		policyUid?: string;
		adjustsPaymentUid?: string;
		adjustmentReason?: string;
		scheme: string;
		grossCommissionPercent: number;
		roleSplitPercent: number;
	}): Promise<CommissionPayment> {
		const uid = uuidv4();
		const now = Date.now();

		const cutDate = this.getCutDateForDueDate(params.dueDate);

		const newPayment: CommissionPayment = {
			uid,
			contractUid: params.contractUid,
			trancheUid: params.trancheUid,
			advisorUid: params.advisorUid,
			role: params.role,
			policyUid: params.policyUid,
			adjustsPaymentUid: params.adjustsPaymentUid,
			adjustmentReason: params.adjustmentReason,
			grossCommissionPercent: params.grossCommissionPercent,
			roleSplitPercent: params.roleSplitPercent,
			amount: params.amount,
			paymentType: 'ADJUSTMENT',
			dueDate: params.dueDate,
			cutDate,
			paid: false,
			cancelled: false,
			installment: 0,
			scheme: params.scheme,
			_create: now,
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		// Firestore does not support explicit `undefined` values.
		const cleanedPayment = _.omitBy(newPayment, _.isUndefined) as unknown as CommissionPayment;
		await setDoc(ref, cleanedPayment as any);

		return cleanedPayment;
	}

	private getCutDateForDueDate(dueDate: number): number {
		const d = new Date(dueDate);
		const year = d.getFullYear();
		const month = d.getMonth();
		const day = d.getDate();

		if (day <= 7) return new Date(year, month, 7).getTime();
		if (day <= 21) return new Date(year, month, 21).getTime();
		return new Date(year, month + 1, 7).getTime();
	}
}
