import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { v4 as uuidv4 } from 'uuid';

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
	async createCommissionPayment(commissionPayment: CommissionPayment): Promise<CommissionPayment> {
		const uid = uuidv4();
		
		const newCommissionPayment: CommissionPayment = {
			...commissionPayment,
			uid,
			_create: Date.now(),
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newCommissionPayment);

		return newCommissionPayment;
	}

	// ✏️ Update commissionPayment
	async updateCommissionPayment(commissionPayment: CommissionPayment): Promise<CommissionPayment> {
		let updateCommissionPayment = _.cloneDeep(commissionPayment);

		updateCommissionPayment._update = Date.now();
		
		const ref = doc(this.firestore, this.collectionName, commissionPayment.uid);
		await updateDoc(ref, { ...updateCommissionPayment });
		
		return updateCommissionPayment;
	}

	// 🗑️ Delete commissionPayment
	async deleteCommissionPayment(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
