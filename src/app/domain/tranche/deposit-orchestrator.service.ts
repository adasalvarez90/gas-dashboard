import { Injectable } from '@angular/core';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import {
	CommissionRoleSplit,
	CommissionPaymentDraft
} from 'src/app/models/commission-engine.model';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';
import { CommissionEngineService } from '../engines/commission-engine.service';
import { RegisterDepositResult, AmendTrancheResult, RecalculateTrancheResult } from './deposit-orchestrator.model';
import { SourceAccountId, SOURCE_ACCOUNT_NO_ESPECIFICADA, isDepositSourceValid } from 'src/app/store/deposit/deposit.model';

/**
 * Domain orchestrator for deposit and tranche-amount flows.
 * Contains only business logic; does not access Firestore or any persistence.
 * ARCHITECTURE: domain layer must not depend on persistence.
 */
@Injectable({ providedIn: 'root' })
export class DepositOrchestratorService {

	constructor(private commissionEngine: CommissionEngineService) {}

	/**
	 * Applies a deposit to a tranche and returns the new state and any commission drafts.
	 * totalDeposited only counts deposits with sourceAccount valid (not no_especificada).
	 * A tranche cannot be marked funded if it has any deposit with no_especificada.
	 * Caller is responsible for validation that contract is not cancelled.
	 */
	registerDeposit(
		deposit: { amount: number; depositedAt: number; sourceAccount?: SourceAccountId },
		tranche: Tranche,
		contract: Contract,
		roleSplits: CommissionRoleSplit[],
		commissionPolicy?: CommissionPolicy | null,
		/** Si el tranche ya tiene depósitos con cuenta no especificada */
		hasOtherNoEspecificadaDeposits = false
	): RegisterDepositResult {
		if (deposit.amount <= 0) {
			throw new Error('El monto del depósito debe ser mayor a 0');
		}
		if (tranche.funded) {
			throw new Error('Este tramo ya está fondeado al 100%');
		}

		const validAmount = isDepositSourceValid(deposit.sourceAccount) ? deposit.amount : 0;
		const newTotal = tranche.totalDeposited + validAmount;
		if (newTotal > tranche.amount) {
			throw new Error('El depósito excede el monto del tramo');
		}

		const updatedTranche: Tranche = {
			...tranche,
			totalDeposited: newTotal,
			lastDepositAt: isDepositSourceValid(deposit.sourceAccount) ? deposit.depositedAt : tranche.lastDepositAt
		};

		let contractActivated = false;
		let commissionDrafts: CommissionPaymentDraft[] = [];

		// Fondeo bloqueado si hay depósitos no_especificada (este o existentes).
		const hasNoEspecificada = deposit.sourceAccount === SOURCE_ACCOUNT_NO_ESPECIFICADA || hasOtherNoEspecificadaDeposits;
		const canFund = newTotal === tranche.amount && !hasNoEspecificada;

		if (canFund) {
			updatedTranche.funded = true;
			updatedTranche.fundedAt = deposit.depositedAt;
			contractActivated = tranche.sequence === 1;
			commissionDrafts = this.commissionEngine.generateForTranche(
				contract,
				updatedTranche,
				roleSplits,
				commissionPolicy
			);
		}

		return {
			updatedTranche,
			contractActivated,
			commissionDrafts
		};
	}

	/**
	 * Recalcula el tranche a partir de la lista completa de depósitos (usado en update/delete).
	 */
	recalculateTrancheFromDeposits(
		deposits: { amount: number; sourceAccount?: SourceAccountId; depositedAt: number }[],
		tranche: Tranche,
		contract: Contract,
		roleSplits: CommissionRoleSplit[],
		commissionPolicy?: CommissionPolicy | null
	): RegisterDepositResult {
		const totalDeposited = deposits.reduce(
			(sum, d) => sum + (isDepositSourceValid(d.sourceAccount) ? d.amount : 0),
			0
		);
		const validDeposits = deposits.filter(d => isDepositSourceValid(d.sourceAccount));
		const lastDepositAt = validDeposits.length > 0
			? Math.max(...validDeposits.map(d => d.depositedAt))
			: tranche.lastDepositAt;
		const hasNoEspecificada = deposits.some(d => d.sourceAccount === SOURCE_ACCOUNT_NO_ESPECIFICADA);
		const canFund = totalDeposited === tranche.amount && !hasNoEspecificada;

		const updatedTranche: Tranche = {
			...tranche,
			totalDeposited,
			lastDepositAt: lastDepositAt ?? tranche.lastDepositAt,
			funded: canFund,
			fundedAt: canFund && lastDepositAt ? lastDepositAt : undefined
		};

		let contractActivated = false;
		let commissionDrafts: CommissionPaymentDraft[] = [];
		if (canFund && !tranche.funded) {
			contractActivated = tranche.sequence === 1;
			commissionDrafts = this.commissionEngine.generateForTranche(
				contract,
				updatedTranche,
				roleSplits,
				commissionPolicy
			);
		}

		return { updatedTranche, contractActivated, commissionDrafts };
	}

	/**
	 * Amends tranche amount (before funded). When totalDeposited === newAmount, marks as funded
	 * with fundedAt = tranche.lastDepositAt (rule B). Caller must ensure lastDepositAt is set
	 * (e.g. backfill from deposits) when funding by amendment.
	 */
	amendTrancheAmount(params: {
		tranche: Tranche;
		contract: Contract;
		newAmount: number;
		amendedAt: number;
		reason?: string;
		roleSplits: CommissionRoleSplit[];
		commissionPolicy?: CommissionPolicy | null;
		/** Si el tranche tiene depósitos con cuenta no especificada, no se puede fondear */
		hasNoEspecificadaDeposits?: boolean;
	}): AmendTrancheResult {
		const { tranche, contract, newAmount, amendedAt, reason, roleSplits, commissionPolicy, hasNoEspecificadaDeposits } = params;

		if (newAmount <= 0) {
			throw new Error('El monto del tramo debe ser mayor a 0');
		}
		if (tranche.funded) {
			throw new Error('No se puede modificar un tramo ya fondeado');
		}
		if (newAmount < tranche.totalDeposited) {
			throw new Error('El monto del tramo no puede ser menor al total ya depositado');
		}

		const prevAmount = tranche.amount;
		const updatedTranche: Tranche = {
			...tranche,
			amount: newAmount,
			amountAmendments: [
				...(tranche.amountAmendments || []),
				{ at: amendedAt, from: prevAmount, to: newAmount, reason }
			]
		};

		let commissionDrafts: CommissionPaymentDraft[] = [];

		let contractActivated = false;
		const canFundByAmendment = tranche.totalDeposited === newAmount && !hasNoEspecificadaDeposits;
		if (canFundByAmendment) {
			updatedTranche.funded = true;
			const lastDepositAt = updatedTranche.lastDepositAt;
			if (lastDepositAt == null) {
				throw new Error(
					'No se puede determinar la fecha del último depósito para fondear el tramo'
				);
			}
			updatedTranche.fundedAt = lastDepositAt;
			contractActivated = tranche.sequence === 1;
			commissionDrafts = this.commissionEngine.generateForTranche(
				contract,
				updatedTranche,
				roleSplits,
				commissionPolicy
			);
		}

		return { updatedTranche, contractActivated, commissionDrafts };
	}
}
