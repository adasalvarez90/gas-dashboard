import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where, writeBatch } from '@angular/fire/firestore';
import * as _ from 'lodash';
import { map } from 'rxjs/operators';

import { CommissionConfig } from 'src/app/store/commission-config/commission-config.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root'
})
export class CommissionConfigFirestoreService {

	private readonly collectionName = 'commissionConfigs';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getCommissionConfigs(): Promise<CommissionConfig[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('_on', '==', true));

		const snap = await getDocs(q);

		const commissionConfigs = snap.docs.map(d => d.data() as CommissionConfig);

		// Sort commissionConfigs by _create date
		commissionConfigs.sort((a, b) => (a._create || 0) - (b._create || 0));

		return commissionConfigs;
	}


	async upsertMany(commissionConfigs: { role: string; source: string; percentage: number }[]) {
		const batch = writeBatch(this.firestore);

		const results: CommissionConfig[] = [];

		for (const c of commissionConfigs) {
			const uid = `${c.role}|${c.source}`; // 🔑 ID determinístico

			const ref = doc(this.firestore, this.collectionName, uid);

			const commissionConfig: CommissionConfig = {
				...c,
				uid,
				_create: Date.now(),
				_on: true,
			};

			batch.set(ref, commissionConfig, { merge: true });

			results.push(commissionConfig);
		}

		await batch.commit();

		return results;
	}
}
