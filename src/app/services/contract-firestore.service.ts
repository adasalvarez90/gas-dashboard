import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { Contract } from 'src/app/store/contract/contract.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root',
})
export class ContractFirestoreService {
	private readonly collectionName = 'contracts';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getContracts(): Promise<Contract[]> {
		const ref = collection(this.firestore, this.collectionName);
		const q = query(ref, where('_on', '==', true));
		
		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as Contract);
	}

	// ➕ Create contract
	async createContract(contract: Contract): Promise<Contract> {
		const uid = uuidv4();
		
		const newContract: Contract = {
			...contract,
			uid,
			_create: Date.now(),
			_on: true
		};

		const ref = doc(this.firestore, this.collectionName, uid);
		await setDoc(ref, newContract);

		return newContract;
	}

	// ✏️ Update contract
	async updateContract(contract: Contract): Promise<Contract> {
		let updateContract = _.cloneDeep(contract);

		updateContract._update = Date.now();
		
		const ref = doc(this.firestore, this.collectionName, contract.uid);
		await updateDoc(ref, { ...updateContract });
		
		return updateContract;
	}

	// 🗑️ Delete contract
	async deleteContract(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.collectionName, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
