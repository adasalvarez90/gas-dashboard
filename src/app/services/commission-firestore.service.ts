import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where, writeBatch } from '@angular/fire/firestore';
import * as _ from 'lodash';
import { map } from 'rxjs/operators';

import { Commission } from 'src/app/store/commission/commission.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root'
})
export class CommissionFirestoreService {

	private readonly collectionName = 'commissions';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getCommissions(): Promise<Commission[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('_on', '==', true));

		const snap = await getDocs(q);

		const commissions = snap.docs.map(d => d.data() as Commission);

		// Sort commissions by _create date
		commissions.sort((a, b) => (a._create || 0) - (b._create || 0));

		return commissions;
	}


	async upsertMany(commissions: { role: string; source: string; percentage: number }[]) {
		const batch = writeBatch(this.firestore);

		const results: Commission[] = [];

		for (const c of commissions) {
			const uid = `${c.role}|${c.source}`; // 🔑 ID determinístico

			const ref = doc(this.firestore, this.collectionName, uid);

			const commission: Commission = {
				uid,
				role: c.role,
				source: c.source,
				percentage: c.percentage,
				_create: Date.now(),
				_on: true,
			};

			batch.set(ref, commission, { merge: true });

			results.push(commission);
		}

		await batch.commit();

		return results;
	}
}
