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
		
		const tranches = snap.docs.map(d => d.data() as Tranche);

		return tranches.sort((a, b) => a.sequence - b.sequence);
	}

	// ➕ Create tranche
	async createTranche(contractUid: string, amount: number): Promise<Tranche> {
		// 1️⃣ Obtener tranches existentes
		const q = query(
			collection(this.firestore, this.collectionName),
			where('contractUid', '==', contractUid),
			where('_on', '==', true)
		);

		const snap = await getDocs(q);

		const tranches = snap.docs.map(d => d.data() as Tranche);

		// 2️⃣ Calcular siguiente sequence
		const maxSequence = tranches.length
			? Math.max(...tranches.map(t => t.sequence))
			: 0;

		const newSequence = maxSequence + 1;

		// 3️⃣ Crear nuevo tranche
		const uid = uuidv4();

		const newTranche: Tranche = {
			uid,
			contractUid,
			sequence: newSequence,
			amount,
			totalDeposited: 0,
			lastDepositAt: undefined,
			funded: false,
			amountAmendments: [],
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
