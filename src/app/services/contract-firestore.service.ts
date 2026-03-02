import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where } from '@angular/fire/firestore';

import * as _ from 'lodash';

import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root',
})
export class ContractFirestoreService {
	private readonly contractsCollection = 'contracts';
	private readonly tranchesCollection = 'contractTranches';

	constructor(private firestore: Firestore) { }

	// ===== GET ALL =====
	async getContracts(): Promise<Contract[]> {
		const ref = collection(this.firestore, this.contractsCollection);
		const q = query(ref, where('_on', '==', true));

		const snap = await getDocs(q);

		return snap.docs.map(d => d.data() as Contract);
	}

	// ➕ Create contract
	async createContractWithInitialTranche(
		contractData: Contract,
		initialCapital: number
	): Promise<Contract> {

		const contractUid = uuidv4();
		const trancheUid = uuidv4();

		const now = Date.now();
		
		let end: Date | null = null;

		if (contractData.startDate) {
			// 🔹 Calcular endDate = startDate + 12 meses
			const start = new Date(contractData.startDate);
			end = new Date(start);
			end.setMonth(end.getMonth() + 12);
		}

		const contract: Contract = {
			...contractData,
			uid: contractUid,
			endDate: end ? end.getTime() : null,
			_create: now,
			_on: true
		};

		const tranche: Tranche = {
			uid: trancheUid,
			contractUid,
			capital: initialCapital,
			totalDeposited: 0,
			funded: false,
			sequence: 1,
			_create: now,
			_on: true
		};

		// 🔥 Guardar ambos
		await setDoc(doc(this.firestore, this.contractsCollection, contractUid), contract);
		await setDoc(doc(this.firestore, this.tranchesCollection, trancheUid), tranche);

		return contract;
	}

	// ✏️ Update contract
	async updateContract(contract: Contract): Promise<Contract> {
		let updateContract = _.cloneDeep(contract);

		updateContract._update = Date.now();

		const ref = doc(this.firestore, this.contractsCollection, contract.uid);
		await updateDoc(ref, { ...updateContract });

		return updateContract;
	}

	// 🗑️ Delete contract
	async deleteContract(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.contractsCollection, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}
}
