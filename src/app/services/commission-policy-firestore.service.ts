import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root',
})
export class CommissionPolicyFirestoreService {
	private readonly collectionName = 'commissionPolicies';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getCommissionPolicies(): Promise<CommissionPolicy[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('_on', '==', true));
		
		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as CommissionPolicy);
	}

	// ➕ Create commissionPolicy
	async createCommissionPolicy(commissionPolicy: CommissionPolicy): Promise<CommissionPolicy> {
		const uid = uuidv4();
		
		const newCommissionPolicy: CommissionPolicy = {
			...commissionPolicy,
			uid,
			_create: Date.now(),
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newCommissionPolicy);

		return newCommissionPolicy;
	}

	// ✏️ Update commissionPolicy
	async updateCommissionPolicy(commissionPolicy: CommissionPolicy): Promise<CommissionPolicy> {
		let updateCommissionPolicy = _.cloneDeep(commissionPolicy);

		updateCommissionPolicy._update = Date.now();
		
		const ref = doc(this.firestore, this.collectionName, commissionPolicy.uid);
		await updateDoc(ref, { ...updateCommissionPolicy });
		
		return updateCommissionPolicy;
	}

	// 🗑️ Delete commissionPolicy
	async deleteCommissionPolicy(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
