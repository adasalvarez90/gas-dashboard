import { Injectable } from '@angular/core';
import { Deposit } from 'src/app/store/deposit/deposit.model';
import { DepositFirestoreService } from 'src/app/services/deposit-firestore.service';
import { TrancheFirestoreService } from 'src/app/services/tranche-firestore.service';
import { ContractFirestoreService } from 'src/app/services/contract-firestore.service';
import { Contract } from 'src/app/store/contract/contract.model';

@Injectable({ providedIn: 'root' })
export class TrancheDepositService {

	constructor(
		private depositFS: DepositFirestoreService,
		private trancheFS: TrancheFirestoreService,
		private contractFS: ContractFirestoreService
	) { }

	async registerDeposit(deposit: Deposit) {

		// 1️⃣ Guardar depósito
		const savedDeposit = await this.depositFS.createDeposit(deposit);

		// 2️⃣ Obtener tranche actual
		const tranches = await this.trancheFS.getTranches(deposit.contractUid);
		const tranche = tranches.find(t => t.uid === deposit.trancheUid);

		if (!tranche) return savedDeposit;

		// 3️⃣ Calcular nuevo total
		const newTotal = tranche.totalDeposited + deposit.amount;
		tranche.totalDeposited = newTotal;

		// 4️⃣ Validar si se fondeó
		if (!tranche.funded && newTotal >= tranche.amount) {
			tranche.funded = true;
			tranche.fundedAt = deposit.depositedAt;

			// 🔥 Si es el primer tranche → activar contrato
			if (tranche.sequence === 1) {
				await this.activateContract(tranche.contractUid, tranche.fundedAt);
			}
		}

		await this.trancheFS.updateTranche(tranche);

		return savedDeposit;
	}

	private async activateContract(contractUid: string, fundedAt: number) {

		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === contractUid);

		if (!contract) return;

		// Solo activar si no está activo ya
		if (contract.contractStatus === 'ACTIVE') return;

		const startDate = fundedAt;
		const endDate = this.addMonthsKeepingDay(startDate, 12);

		const updated: Contract = {
			...contract,
			startDate,
			endDate,
			contractStatus: 'ACTIVE'
		};

		await this.contractFS.updateContract(updated);
	}

	private addMonthsKeepingDay(timestamp: number, months: number) {
		const d = new Date(timestamp);
		const day = d.getDate();

		d.setMonth(d.getMonth() + months);

		// Manejo especial para febrero
		if (d.getDate() !== day) {
			d.setDate(0);
		}

		return d.getTime();
	}
}