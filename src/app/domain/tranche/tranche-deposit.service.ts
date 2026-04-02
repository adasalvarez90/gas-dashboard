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
import { CommissionPolicyFirestoreService } from 'src/app/services/commission-policy-firestore.service';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';
import { resolveDynamicForTranche } from '../commission-policy/resolve-dynamic-for-tranche';
import {
	computeAccountStatusAfterTranche1Funded,
	computePaymentsAfterTranche1Funded,
	normalizeContractAccounts,
} from '../contract/contract-derived-fields.util';
import { isDepositSourceValid, SOURCE_ACCOUNT_NO_ESPECIFICADA } from 'src/app/store/deposit/deposit.model';

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
		private commissionPolicyFS: CommissionPolicyFirestoreService,
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
		if (contract.contractStatus === 'CANCELLED') {
			throw new Error('No se pueden registrar depósitos en un contrato cancelado');
		}

		const existingDeposits = await this.depositFS.getDeposits(tranche.uid);
		const hasOtherNoEspecificadaDeposits = existingDeposits.some(
			d => d.sourceAccount === SOURCE_ACCOUNT_NO_ESPECIFICADA
		);

		const configs = await this.commissionConfigFS.getCommissionConfigs();
		const roleSplits = this.roleResolver.resolveRoleSplits(contract, configs);

		const validAmount = isDepositSourceValid(deposit.sourceAccount) ? deposit.amount : 0;
		const willFund = tranche.totalDeposited + validAmount === tranche.amount &&
			!hasOtherNoEspecificadaDeposits &&
			deposit.sourceAccount !== SOURCE_ACCOUNT_NO_ESPECIFICADA;
		const commissionPolicy = willFund
			? await this.resolveCommissionPolicy(contract, tranche, deposit.depositedAt)
			: null;

		const result = this.orchestrator.registerDeposit(
			{ amount: deposit.amount, depositedAt: deposit.depositedAt, sourceAccount: deposit.sourceAccount },
			tranche,
			contract,
			roleSplits,
			commissionPolicy,
			hasOtherNoEspecificadaDeposits
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
		if (contract.contractStatus === 'CANCELLED') {
			throw new Error('No se puede modificar un tramo en un contrato cancelado');
		}

		const deposits = await this.depositFS.getDeposits(tranche.uid);
		let trancheForOrchestrator = { ...tranche };
		if (
			tranche.totalDeposited === newAmount &&
			tranche.lastDepositAt == null &&
			tranche.totalDeposited > 0
		) {
			const lastDepositAt = deposits.reduce(
				(max, d) => Math.max(max, d.depositedAt ?? 0),
				0
			);
			trancheForOrchestrator = { ...tranche, lastDepositAt: lastDepositAt || undefined };
		}
		const hasNoEspecificadaDeposits = deposits.some(
			d => d.sourceAccount === SOURCE_ACCOUNT_NO_ESPECIFICADA
		);

		const configs = await this.commissionConfigFS.getCommissionConfigs();
		const roleSplits = this.roleResolver.resolveRoleSplits(contract, configs);

		const willFundByAmendment = trancheForOrchestrator.totalDeposited === newAmount && !hasNoEspecificadaDeposits;
		const fundedAt = trancheForOrchestrator.lastDepositAt;
		const commissionPolicy = willFundByAmendment && fundedAt != null
			? await this.resolveCommissionPolicy(contract, tranche, fundedAt)
			: null;

		const result = this.orchestrator.amendTrancheAmount({
			tranche: trancheForOrchestrator,
			contract,
			newAmount,
			amendedAt,
			reason,
			roleSplits,
			commissionPolicy,
			hasNoEspecificadaDeposits
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

	async updateDeposit(deposit: Deposit): Promise<Deposit> {
		const tranches = await this.trancheFS.getTranches(deposit.contractUid);
		const tranche = tranches.find(t => t.uid === deposit.trancheUid);
		if (!tranche) throw new Error('Tranche no encontrado');
		if (tranche.funded) throw new Error('No se puede editar depósitos en un tramo ya fondeado');

		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === deposit.contractUid);
		if (!contract || contract.contractStatus === 'CANCELLED') throw new Error('Contrato no encontrado o cancelado');

		const allDeposits = await this.depositFS.getDeposits(tranche.uid);
		const updatedList = allDeposits.map(d => d.uid === deposit.uid ? deposit : d);

		const configs = await this.commissionConfigFS.getCommissionConfigs();
		const roleSplits = this.roleResolver.resolveRoleSplits(contract, configs);
		const fundedAt = updatedList.reduce((max, d) => Math.max(max, d.depositedAt ?? 0), 0);
		const commissionPolicy = await this.resolveCommissionPolicy(contract, tranche, fundedAt);

		const result = this.orchestrator.recalculateTrancheFromDeposits(
			updatedList.map(d => ({ amount: d.amount, sourceAccount: d.sourceAccount, depositedAt: d.depositedAt })),
			tranche,
			contract,
			roleSplits,
			commissionPolicy
		);

		const updatedDeposit = await this.depositFS.updateDeposit(deposit);
		await this.trancheFS.updateTranche(result.updatedTranche);

		if (result.contractActivated && result.updatedTranche.fundedAt) {
			await this.activateContract(deposit.contractUid, result.updatedTranche.fundedAt);
		}
		if (result.commissionDrafts.length > 0) {
			const existing = await this.commissionPaymentFS.getCommissionPayments(tranche.uid);
			if (existing.length === 0) {
				await this.commissionPaymentFS.createManyCommissionPayment(result.commissionDrafts);
			}
		}
		return updatedDeposit;
	}

	async deleteDeposit(uid: string): Promise<void> {
		const deposit = await this.depositFS.getDeposit(uid);
		if (!deposit) throw new Error('Depósito no encontrado');

		const tranches = await this.trancheFS.getTranches(deposit.contractUid);
		const tranche = tranches.find(t => t.uid === deposit.trancheUid);
		if (!tranche) throw new Error('Tranche no encontrado');
		if (tranche.funded) throw new Error('No se puede eliminar depósitos de un tramo ya fondeado');

		const contracts = await this.contractFS.getContracts();
		const contract = contracts.find(c => c.uid === deposit.contractUid);
		if (!contract || contract.contractStatus === 'CANCELLED') throw new Error('Contrato no encontrado o cancelado');

		const allDeposits = await this.depositFS.getDeposits(tranche.uid);
		const remainingDeposits = allDeposits.filter(d => d.uid !== uid);

		const configs = await this.commissionConfigFS.getCommissionConfigs();
		const roleSplits = this.roleResolver.resolveRoleSplits(contract, configs);
		const lastDepositAt = remainingDeposits.reduce((max, d) => Math.max(max, d.depositedAt ?? 0), 0);
		const commissionPolicy = await this.resolveCommissionPolicy(contract, tranche, lastDepositAt || Date.now());

		const result = this.orchestrator.recalculateTrancheFromDeposits(
			remainingDeposits.map(d => ({ amount: d.amount, sourceAccount: d.sourceAccount, depositedAt: d.depositedAt })),
			tranche,
			contract,
			roleSplits,
			commissionPolicy
		);

		await this.depositFS.deleteDeposit(uid);
		await this.trancheFS.updateTranche(result.updatedTranche);

		if (result.contractActivated && result.updatedTranche.fundedAt) {
			await this.activateContract(deposit.contractUid, result.updatedTranche.fundedAt);
		}
		if (result.commissionDrafts.length > 0) {
			const existing = await this.commissionPaymentFS.getCommissionPayments(tranche.uid);
			if (existing.length === 0) {
				await this.commissionPaymentFS.createManyCommissionPayment(result.commissionDrafts);
			}
		}
	}

	private async resolveCommissionPolicy(
		contract: Contract,
		tranche: Tranche,
		fundedAt: number
	): Promise<CommissionPolicy | null> {
		const policies = await this.commissionPolicyFS.getCommissionPolicies();
		return resolveDynamicForTranche(tranche, contract, policies, fundedAt);
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
			contractStatus: 'ACTIVE',
			payments: computePaymentsAfterTranche1Funded(fundedAt),
			accountStatus: computeAccountStatusAfterTranche1Funded(fundedAt),
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
