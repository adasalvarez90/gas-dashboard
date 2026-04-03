import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';
import { validateAndNormalizeCommissionPolicy } from 'src/app/domain/commission-policy/commission-policy.validation';
import { v4 as uuidv4 } from 'uuid';

/** Firestore no acepta `undefined` en ningún nivel del documento. */
function omitUndefinedDeep<T>(input: T): T {
	if (input === null || typeof input !== 'object') {
		return input;
	}
	if (Array.isArray(input)) {
		return input.map((item) => omitUndefinedDeep(item)) as T;
	}
	const out: Record<string, unknown> = {};
	for (const [key, val] of Object.entries(input as Record<string, unknown>)) {
		if (val === undefined) {
			continue;
		}
		out[key] = omitUndefinedDeep(val);
	}
	return out as T;
}

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
		const validated = validateAndNormalizeCommissionPolicy(commissionPolicy);

		const newCommissionPolicy: CommissionPolicy = {
			...validated,
			uid,
			_create: Date.now(),
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		const forFirestore = omitUndefinedDeep(newCommissionPolicy);
		await setDoc(ref, forFirestore);

		return newCommissionPolicy;
	}

	// ✏️ Update commissionPolicy
	async updateCommissionPolicy(commissionPolicy: CommissionPolicy): Promise<CommissionPolicy> {
		let updateCommissionPolicy = _.cloneDeep(
			validateAndNormalizeCommissionPolicy(commissionPolicy)
		);

		updateCommissionPolicy._update = Date.now();
		
		const ref = doc(this.firestore, this.collectionName, commissionPolicy.uid);
		await updateDoc(ref, omitUndefinedDeep({ ...updateCommissionPolicy }));
		
		return updateCommissionPolicy;
	}

	// 🗑️ Delete commissionPolicy
	async deleteCommissionPolicy(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
