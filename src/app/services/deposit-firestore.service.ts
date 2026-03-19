import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, getDoc, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { Deposit } from 'src/app/store/deposit/deposit.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root',
})
export class DepositFirestoreService {
	private readonly collectionName = 'deposits';

	constructor(private firestore: Firestore) { }

	// ===== GET ONE =====
	async getDeposit(uid: string): Promise<Deposit | null> {
		const ref = doc(this.firestore, this.collectionName, uid);
		const snap = await getDoc(ref);
		if (!snap.exists()) return null;
		const data = snap.data() as Deposit;
		return data._on !== false ? data : null;
	}

	// ===== GET ALL =====
	async getDeposits(trancheUid: string): Promise<Deposit[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('trancheUid', '==', trancheUid), where('_on', '==', true));
		
		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as Deposit);
	}

	// ➕ Create deposit
	async createDeposit(deposit: Deposit): Promise<Deposit> {
		const uid = uuidv4();
		
		const newDeposit: Deposit = {
			...deposit,
			uid,
			_create: Date.now(),
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newDeposit);

		return newDeposit;
	}

	// ✏️ Update deposit
	async updateDeposit(deposit: Deposit): Promise<Deposit> {
		let updateDeposit = _.cloneDeep(deposit);

		updateDeposit._update = Date.now();
		
		const ref = doc(this.firestore, this.collectionName, deposit.uid);
		await updateDoc(ref, { ...updateDeposit });
		
		return updateDeposit;
	}

	// 🗑️ Delete deposit
	async deleteDeposit(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
