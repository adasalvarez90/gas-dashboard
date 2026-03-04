import { Injectable } from '@angular/core';
// Models
import { Deposit } from 'src/app/store/deposit/deposit.model';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
// Services
import { CommissionEngineService } from '../engines/commission-engine.service';
import { RoleResolverService } from '../engines/role-resolver.service';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';
import { CommissionConfigFirestoreService } from 'src/app/services/commission-config-firestore.service';

import { DepositFirestoreService } from 'src/app/services/deposit-firestore.service';
import { TrancheFirestoreService } from 'src/app/services/tranche-firestore.service';
import { ContractFirestoreService } from 'src/app/services/contract-firestore.service';

@Injectable({ providedIn: 'root' })
export class TrancheDepositService {

	constructor(
		private depositFS: DepositFirestoreService,
		private trancheFS: TrancheFirestoreService,
		private contractFS: ContractFirestoreService,
		private commissionEngine: CommissionEngineService,
		private roleResolver: RoleResolverService,
		private commissionPaymentFS: CommissionPaymentFirestoreService,
		private commissionConfigFS: CommissionConfigFirestoreService,
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

			// 🔥 generar comisiones
			await this.generateCommissions(tranche);
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

	private async generateCommissions(tranche: Tranche) {

		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === tranche.contractUid);

		if (!contract) return;

		// Obtener matriz de comisiones
		const configs = await this.commissionConfigFS.getCommissionConfigs();

		const roleSplits =
			this.roleResolver.resolveRoleSplits(contract, configs);

		const drafts =
			this.commissionEngine.generateForTranche(
				contract,
				tranche,
				roleSplits
			);

		await this.commissionPaymentFS.createManyCommissionPayment(drafts);
	}
}