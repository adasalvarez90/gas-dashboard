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
		tranche.lastDepositAt = deposit.depositedAt;

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

	/**
	 * Enmienda de monto del tranche (antes de funded=true).
	 *
	 * Regla clave: nuevoAmount NO puede ser menor a totalDeposited.
	 * Si al enmendar se alcanza el fondeo (totalDeposited === nuevoAmount),
	 * fundedAt se fija como la fecha del ÚLTIMO depósito (regla B).
	 */
	async amendTrancheAmount(params: {
		contractUid: string;
		trancheUid: string;
		newAmount: number;
		amendedAt: number;
		reason?: string;
	}) {
		const { contractUid, trancheUid, newAmount, amendedAt, reason } = params;

		if (newAmount <= 0) {
			throw new Error('El monto del tramo debe ser mayor a 0');
		}

		// 1️⃣ Obtener tranche actual
		const tranches = await this.trancheFS.getTranches(contractUid);
		const tranche = tranches.find(t => t.uid === trancheUid);

		if (!tranche) {
			throw new Error('Tranche no encontrado');
		}

		if (tranche.funded) {
			throw new Error('No se puede modificar un tramo ya fondeado');
		}

		// Si ya existen comisiones, no permitimos enmiendas (historial financiero ya creado)
		const existing = await this.commissionPaymentFS.getCommissionPayments(tranche.uid);
		if (existing.length > 0) {
			throw new Error('No se puede modificar el tramo porque ya existen comisiones generadas');
		}

		// 2️⃣ Obtener contrato
		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === contractUid);

		if (!contract) {
			throw new Error('Contrato no encontrado');
		}

		if (contract.accountStatus === 'CANCELLED') {
			throw new Error('No se puede modificar un tramo en un contrato cancelado');
		}

		// 3️⃣ Validar que no quede por debajo de lo ya depositado
		if (newAmount < tranche.totalDeposited) {
			throw new Error('El monto del tramo no puede ser menor al total ya depositado');
		}

		const prevAmount = tranche.amount;
		tranche.amount = newAmount;
		tranche.amountAmendments = [
			...(tranche.amountAmendments || []),
			{ at: amendedAt, from: prevAmount, to: newAmount, reason }
		];

		// 4️⃣ Si con la enmienda ya quedó fondeado, fijar fundedAt por regla B
		if (tranche.totalDeposited === tranche.amount) {
			tranche.funded = true;

			let lastDepositAt = tranche.lastDepositAt;

			// Backfill: si no tenemos lastDepositAt pero hay depósitos, calcularlo
			if (!lastDepositAt && tranche.totalDeposited > 0) {
				const deposits = await this.depositFS.getDeposits(tranche.uid);
				lastDepositAt = deposits.reduce((max, d) => Math.max(max, d.depositedAt || 0), 0) || undefined;
				tranche.lastDepositAt = lastDepositAt;
			}

			if (!lastDepositAt) {
				throw new Error('No se puede determinar la fecha del último depósito para fondear el tramo');
			}

			tranche.fundedAt = lastDepositAt;

			if (tranche.sequence === 1) {
				await this.activateContract(tranche.contractUid, tranche.fundedAt);
			}

			await this.generateCommissions(tranche);
		}

		await this.trancheFS.updateTranche(tranche);

		return tranche;
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

		// Idempotencia: nunca generar dos veces para el mismo tranche
		const existing = await this.commissionPaymentFS.getCommissionPayments(tranche.uid);
		if (existing.length > 0) return;

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