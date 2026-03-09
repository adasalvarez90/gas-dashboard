import { Injectable } from '@angular/core';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import {
	CommissionRoleSplit,
	CommissionPaymentDraft
} from 'src/app/models/commission-engine.model';
import { CommissionEngineService } from '../engines/commission-engine.service';
import { RegisterDepositResult, AmendTrancheResult } from './deposit-orchestrator.model';

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
	 * Caller is responsible for validation that contract is not cancelled.
	 */
	registerDeposit(
		deposit: { amount: number; depositedAt: number },
		tranche: Tranche,
		contract: Contract,
		roleSplits: CommissionRoleSplit[]
	): RegisterDepositResult {
		if (deposit.amount <= 0) {
			throw new Error('El monto del depósito debe ser mayor a 0');
		}
		if (tranche.funded) {
			throw new Error('Este tramo ya está fondeado al 100%');
		}

		const newTotal = tranche.totalDeposited + deposit.amount;
		if (newTotal > tranche.amount) {
			throw new Error('El depósito excede el monto del tramo');
		}

		const updatedTranche: Tranche = {
			...tranche,
			totalDeposited: newTotal,
			lastDepositAt: deposit.depositedAt
		};

		let contractActivated = false;
		let commissionDrafts: CommissionPaymentDraft[] = [];

		if (newTotal === tranche.amount) {
			updatedTranche.funded = true;
			updatedTranche.fundedAt = deposit.depositedAt;
			contractActivated = tranche.sequence === 1;
			commissionDrafts = this.commissionEngine.generateForTranche(
				contract,
				updatedTranche,
				roleSplits
			);
		}

		return {
			updatedTranche,
			contractActivated,
			commissionDrafts
		};
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
	}): AmendTrancheResult {
		const { tranche, contract, newAmount, amendedAt, reason, roleSplits } = params;

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
		if (tranche.totalDeposited === newAmount) {
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
				roleSplits
			);
		}

		return { updatedTranche, contractActivated, commissionDrafts };
	}
}
