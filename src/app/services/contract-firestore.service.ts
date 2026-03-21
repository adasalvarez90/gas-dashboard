import { Injectable } from '@angular/core';
import { Firestore, collection, getDocs, doc, updateDoc, setDoc, query, where, writeBatch } from '@angular/fire/firestore';
import { deleteField } from 'firebase/firestore';

import * as _ from 'lodash';

import { Contract, ContractBeneficiary, ContractStatus } from 'src/app/store/contract/contract.model';
import {
	normalizeContractAccounts,
	resolvePaymentsAndAccountStatus,
} from 'src/app/domain/contract/contract-derived-fields.util';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionPayment } from 'src/app/store/commission-payment/commission-payment.model';
import { TrancheFirestoreService } from './tranche-firestore.service';
import { toCanonicalMexicoDateTimestamp } from 'src/app/domain/time/mexico-time.util';

import { v4 as uuidv4 } from 'uuid';

@Injectable({
	providedIn: 'root',
})
export class ContractFirestoreService {
	private readonly contractsCollection = 'contracts';
	private readonly tranchesCollection = 'tranches';

	constructor(
		private firestore: Firestore,
		private trancheFS: TrancheFirestoreService,
	) { }

	// ===== GET ALL =====
	async getContracts(): Promise<Contract[]> {
		const ref = collection(this.firestore, this.contractsCollection);
		const q = query(ref, where('_on', '==', true));

		const snap = await getDocs(q);

		return snap.docs.map((d) => this.normalizeFromDoc(d.data() as Record<string, unknown>));
	}

	private normalizeFromDoc(raw: Record<string, unknown>): Contract {
		const c = raw as unknown as Contract;
		let beneficiaries: ContractBeneficiary[] | undefined;
		const b = raw['beneficiaries'];
		if (Array.isArray(b)) {
			beneficiaries = b as ContractBeneficiary[];
		}
		const withAccounts = normalizeContractAccounts({
			...c,
			beneficiaries,
		});
		const status = (c.contractStatus || 'PENDING') as ContractStatus;
		const { payments, accountStatus } = resolvePaymentsAndAccountStatus({
			contractStatus: status,
			startDate: typeof c.startDate === 'number' ? c.startDate : undefined,
		});
		return {
			...withAccounts,
			payments,
			accountStatus,
		};
	}

	// ➕ Create contract only (no tranche); use when contract is not signed yet.
	async createContract(contractData: Contract): Promise<Contract> {
		const contractUid = uuidv4();
		const now = Date.now();
		const contract: Contract = {
			...contractData,
			signatureDate: toCanonicalMexicoDateTimestamp(contractData.signatureDate),
			uid: contractUid,
			contractStatus: 'PENDING',
			startDate: undefined,
			endDate: undefined,
			payments: '',
			accountStatus: '',
			_create: now,
			_on: true,
		};
		const docData = _.omitBy(contract, _.isUndefined) as Record<string, unknown>;
		await setDoc(doc(this.firestore, this.contractsCollection, contractUid), docData);
		return contract;
	}

	// ➕ Create contract and first tranche only when signed + signatureDate + initialCapital.
	async createContractWithInitialTranche(
		contractData: Contract,
		initialCapital: number
	): Promise<Contract> {
		const contractUid = uuidv4();
		const now = Date.now();
		const contract: Contract = {
			...contractData,
			signatureDate: toCanonicalMexicoDateTimestamp(contractData.signatureDate),
			uid: contractUid,
			contractStatus: 'PENDING',
			startDate: undefined,
			endDate: undefined,
			initialCapital: initialCapital,
			payments: '',
			accountStatus: '',
			_create: now,
			_on: true,
		};
		const contractDocData = _.omitBy(contract, _.isUndefined) as Record<string, unknown>;
		await setDoc(doc(this.firestore, this.contractsCollection, contractUid), contractDocData);

		const shouldCreateTranche =
			contractData.signed === true &&
			contract.signatureDate != null &&
			initialCapital != null &&
			initialCapital > 0;

		if (shouldCreateTranche) {
			await this.trancheFS.createTranche(
				contractUid,
				initialCapital,
				undefined,
				contract.signatureDate
			);
		}

		return contract;
	}

	// ✏️ Update contract
	async updateContract(contract: Contract): Promise<Contract> {
		const updateContract = _.cloneDeep(contract);
		updateContract.signatureDate = toCanonicalMexicoDateTimestamp(updateContract.signatureDate);
		updateContract._update = Date.now();
		const docData = _.omitBy(updateContract, _.isUndefined) as Record<string, unknown>;
		docData['clientAccount'] = deleteField();
		const ref = doc(this.firestore, this.contractsCollection, contract.uid);
		await updateDoc(ref, docData);
		return updateContract;
	}

	// ✏️ Update contract and create first tranche if contract was just signed (no tranches yet).
	async updateContractAndCreateFirstTrancheIfNeeded(contract: Contract): Promise<Contract> {
		await this.updateContract(contract);

		const shouldCreateFirstTranche =
			contract.signed === true &&
			contract.signatureDate != null &&
			contract.initialCapital != null &&
			contract.initialCapital > 0;

		if (!shouldCreateFirstTranche) return contract;

		const tranches = await this.trancheFS.getTranches(contract.uid);
		if (tranches.length === 0) {
			await this.trancheFS.createTranche(
				contract.uid,
				contract.initialCapital!,
				undefined,
				contract.signatureDate
			);
		}

		return contract;
	}

	// 🗑️ Delete contract
	async deleteContract(uid: string): Promise<void> {
		const ref = doc(this.firestore, this.contractsCollection, uid);
		await updateDoc(ref, { _remove: Date.now(), _on: false });
	}

	async cancelContract(contract: Contract) {

		const now = Date.now();

		await updateDoc(
			doc(this.firestore, 'contracts', contract.uid),
			{
				contractStatus: 'CANCELLED',
				payments: '',
				accountStatus: '',
				cancelledAt: now,
				_update: now,
			}
		);

		// Cancelar comisiones futuras
		const q = query(
			collection(this.firestore, 'commissionPayments'),
			where('contractUid', '==', contract.uid),
			where('paid', '==', false),
			where('_on', '==', true)
		);

		const snap = await getDocs(q);

		const batch = writeBatch(this.firestore);

		snap.docs.forEach(d => {
			const payment = d.data() as CommissionPayment;

			if (payment.cancelled) return;

			if (payment.dueDate > now) {
				batch.update(d.ref, { cancelled: true, _update: now });
			}
		});

		await batch.commit();
	}
}
