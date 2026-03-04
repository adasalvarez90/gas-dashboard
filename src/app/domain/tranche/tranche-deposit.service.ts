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

		if (deposit.amount <= 0) {
			throw new Error('El monto del depósito debe ser mayor a 0');
		}

		// 1️⃣ Obtener tranche actual
		const tranches = await this.trancheFS.getTranches(deposit.contractUid);
		const tranche = tranches.find(t => t.uid === deposit.trancheUid);

		if (!tranche) {
			throw new Error('Tranche no encontrado');
		}

		if (tranche.funded) {
			throw new Error('Este tramo ya está fondeado al 100%');
		}

		// 2️⃣ Obtener contrato
		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === deposit.contractUid);

		if (!contract) {
			throw new Error('Contrato no encontrado');
		}

		if (contract.accountStatus === 'CANCELLED') {
			throw new Error('No se pueden registrar depósitos en un contrato cancelado');
		}

		// 3️⃣ Validar excedente
		const newTotal = tranche.totalDeposited + deposit.amount;

		if (newTotal > tranche.amount) {
			throw new Error('El depósito excede el monto del tramo');
		}

		// 4️⃣ Guardar depósito
		const savedDeposit = await this.depositFS.createDeposit(deposit);

		tranche.totalDeposited = newTotal;

		// 5️⃣ Verificar si se fondeó
		if (newTotal === tranche.amount) {
			tranche.funded = true;
			tranche.fundedAt = deposit.depositedAt;

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