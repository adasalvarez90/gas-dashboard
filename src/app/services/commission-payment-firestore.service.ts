import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

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
	async getCommissionPayments(contractUid: string, advisorUid: string): Promise<CommissionPayment[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('contractUid', '==', contractUid), where('advisorUid', '==', advisorUid), where('_on', '==', true));
		
		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPayment);
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
			createdPayments.push(newPayment);
			
			await setDoc(ref, newPayment);
		}

		return createdPayments;
	}
}
