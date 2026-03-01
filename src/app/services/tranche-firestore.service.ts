import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { Tranche } from 'src/app/store/tranche/tranche.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root',
})
export class TrancheFirestoreService {
	private readonly collectionName = 'tranches';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getTranches(contractUid: string): Promise<Tranche[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('contractUid', '==', contractUid), where('_on', '==', true));
		
		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as Tranche);
	}

	// ➕ Create tranche
	async createTranche(tranche: Tranche): Promise<Tranche> {
		const uid = uuidv4();
		
		const newTranche: Tranche = {
			...tranche,
			uid,
			_create: Date.now(),
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newTranche);

		return newTranche;
	}

	// ✏️ Update tranche
	async updateTranche(tranche: Tranche): Promise<Tranche> {
		let updateTranche = _.cloneDeep(tranche);

		updateTranche._update = Date.now();
		
		const ref = doc(this.firestore, this.collectionName, tranche.uid);
		await updateDoc(ref, { ...updateTranche });
		
		return updateTranche;
	}

	// 🗑️ Delete tranche
	async deleteTranche(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
