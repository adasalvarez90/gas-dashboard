import { Injectable } from '@angular/core';
import { Deposit } from 'src/app/store/deposit/deposit.model';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { DepositOrchestratorService } from './deposit-orchestrator.service';
import { RoleResolverService } from '../engines/role-resolver.service';
import { DepositFirestoreService } from 'src/app/services/deposit-firestore.service';
import { TrancheFirestoreService } from 'src/app/services/tranche-firestore.service';
import { ContractFirestoreService } from 'src/app/services/contract-firestore.service';
import { CommissionConfigFirestoreService } from 'src/app/services/commission-config-firestore.service';
import { CommissionPaymentFirestoreService } from 'src/app/services/commission-payment-firestore.service';

/**
 * Application service: coordinates persistence and domain.
 * Loads data from Firestore, calls domain orchestrator (no Firestore), then persists results.
 */
@Injectable({ providedIn: 'root' })
export class TrancheDepositService {

	constructor(
		private depositFS: DepositFirestoreService,
		private trancheFS: TrancheFirestoreService,
		private contractFS: ContractFirestoreService,
		private commissionConfigFS: CommissionConfigFirestoreService,
		private commissionPaymentFS: CommissionPaymentFirestoreService,
		private orchestrator: DepositOrchestratorService,
		private roleResolver: RoleResolverService
	) {}

	async registerDeposit(deposit: Deposit) {
		const tranches = await this.trancheFS.getTranches(deposit.contractUid);
		const tranche = tranches.find(t => t.uid === deposit.trancheUid);
		if (!tranche) throw new Error('Tranche no encontrado');

		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === deposit.contractUid);
		if (!contract) throw new Error('Contrato no encontrado');
		if (contract.accountStatus === 'CANCELLED') {
			throw new Error('No se pueden registrar depósitos en un contrato cancelado');
		}

		const configs = await this.commissionConfigFS.getCommissionConfigs();
		const roleSplits = this.roleResolver.resolveRoleSplits(contract, configs);

		const result = this.orchestrator.registerDeposit(
			{ amount: deposit.amount, depositedAt: deposit.depositedAt },
			tranche,
			contract,
			roleSplits
		);

		const savedDeposit = await this.depositFS.createDeposit(deposit);
		await this.trancheFS.updateTranche(result.updatedTranche);

		if (result.contractActivated) {
			await this.activateContract(deposit.contractUid, result.updatedTranche.fundedAt!);
		}

		if (result.commissionDrafts.length > 0) {
			const existing = await this.commissionPaymentFS.getCommissionPayments(tranche.uid);
			if (existing.length === 0) {
				await this.commissionPaymentFS.createManyCommissionPayment(result.commissionDrafts);
			}
		}

		return savedDeposit;
	}

	/**
	 * Enmienda de monto del tranche (antes de funded=true).
	 * Si ya existen comisiones para el tranche, se rechaza.
	 */
	async amendTrancheAmount(params: {
		contractUid: string;
		trancheUid: string;
		newAmount: number;
		amendedAt: number;
		reason?: string;
	}) {
		const { contractUid, trancheUid, newAmount, amendedAt, reason } = params;

		const tranches = await this.trancheFS.getTranches(contractUid);
		const tranche = tranches.find(t => t.uid === trancheUid);
		if (!tranche) throw new Error('Tranche no encontrado');

		const existingPayments = await this.commissionPaymentFS.getCommissionPayments(tranche.uid);
		if (existingPayments.length > 0) {
			throw new Error('No se puede modificar el tramo porque ya existen comisiones generadas');
		}

		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === contractUid);
		if (!contract) throw new Error('Contrato no encontrado');
		if (contract.accountStatus === 'CANCELLED') {
			throw new Error('No se puede modificar un tramo en un contrato cancelado');
		}

		let trancheForOrchestrator = { ...tranche };
		if (
			tranche.totalDeposited === newAmount &&
			tranche.lastDepositAt == null &&
			tranche.totalDeposited > 0
		) {
			const deposits = await this.depositFS.getDeposits(tranche.uid);
			const lastDepositAt = deposits.reduce(
				(max, d) => Math.max(max, d.depositedAt ?? 0),
				0
			);
			trancheForOrchestrator = { ...tranche, lastDepositAt: lastDepositAt || undefined };
		}

		const configs = await this.commissionConfigFS.getCommissionConfigs();
		const roleSplits = this.roleResolver.resolveRoleSplits(contract, configs);

		const result = this.orchestrator.amendTrancheAmount({
			tranche: trancheForOrchestrator,
			contract,
			newAmount,
			amendedAt,
			reason,
			roleSplits
		});

		await this.trancheFS.updateTranche(result.updatedTranche);

		if (result.contractActivated && result.updatedTranche.fundedAt) {
			await this.activateContract(contractUid, result.updatedTranche.fundedAt);
		}

		if (result.commissionDrafts.length > 0) {
			await this.commissionPaymentFS.createManyCommissionPayment(result.commissionDrafts);
		}

		return result.updatedTranche;
	}

	private async activateContract(contractUid: string, fundedAt: number) {
		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === contractUid);
		if (!contract || contract.contractStatus === 'ACTIVE') return;

		const startDate = fundedAt;
		const endDate = this.addMonthsKeepingDay(startDate, 12);
		await this.contractFS.updateContract({
			...contract,
			startDate,
			endDate,
			contractStatus: 'ACTIVE'
		});
	}

	private addMonthsKeepingDay(timestamp: number, months: number): number {
		const d = new Date(timestamp);
		const day = d.getDate();
		d.setMonth(d.getMonth() + months);
		if (d.getDate() !== day) d.setDate(0);
		return d.getTime();
	}
}
