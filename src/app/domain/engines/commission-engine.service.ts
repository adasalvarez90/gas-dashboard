import { Injectable } from '@angular/core';
import { Contract } from '../../store/contract/contract.model';
import { Tranche } from '../../store/tranche/tranche.model';
import { CommissionPaymentDraft } from '../../models/commission-engine.model';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';
import { getCutDateForDueDateMexico, toCanonicalMexicoDateTimestamp } from 'src/app/domain/time/mexico-time.util';
import { normalizeCommissionPolicy } from '../commission-policy/commission-policy-normalize';
import { sumMatchingAdditionalPercent } from '../commission-policy/commission-policy-dynamics.util';

@Injectable({ providedIn: 'root' })
export class CommissionEngineService {

	generateForTranche(
		contract: Contract,
		tranche: Tranche,
		roleSplits,
		commissionPolicy?: CommissionPolicy | null
	): CommissionPaymentDraft[] {

		if (!tranche.fundedAt) return [];

		const drafts: CommissionPaymentDraft[] = [];

		const normalized = commissionPolicy ? normalizeCommissionPolicy(commissionPolicy) : null;

		const schemeAImmediatePercent = 4 + (normalized && contract.scheme === 'A'
			? sumMatchingAdditionalPercent(normalized, contract, 'IMMEDIATE')
			: 0);

		const schemeARecurringPercent = 5 + (normalized && contract.scheme === 'A'
			? sumMatchingAdditionalPercent(normalized, contract, 'RECURRING')
			: 0);

		const schemeBImmediatePercent = 4 + (normalized && contract.scheme === 'B'
			? sumMatchingAdditionalPercent(normalized, contract, 'IMMEDIATE')
			: 0);

		const schemeBExtraPercent = this.getSchemeBExtraPercentByYield(contract.yieldPercent ?? 20);

		const grossCommissionPercent = contract.scheme === 'A'
			? schemeAImmediatePercent + schemeARecurringPercent
			: schemeBImmediatePercent + schemeBExtraPercent;

		const totalCommission =
			tranche.amount * (grossCommissionPercent / 100);

		const startDate = toCanonicalMexicoDateTimestamp(tranche.fundedAt)!;

		roleSplits.forEach(split => {

			const roleTotal =
				totalCommission * (split.percent / 100);

			// =========================
			// IMMEDIATE
			// =========================

			const immediatePercent = contract.scheme === 'A'
				? schemeAImmediatePercent
				: schemeBImmediatePercent;

			const immediateAmount =
				tranche.amount *
				(immediatePercent / 100) *
				(split.percent / 100);

			drafts.push({
				contractUid: contract.uid,
				trancheUid: tranche.uid,

				advisorUid: split.advisorUid,
				role: split.role,
				source: contract.source,
				policyUid: this.getPolicyUidForDraft(commissionPolicy),

				amount: immediateAmount,

				installment: 1,

				scheme: contract.scheme,

				grossCommissionPercent,
				roleSplitPercent: split.percent,

				paymentType: 'IMMEDIATE',

				dueDate: startDate,
				cutDate: this.getCutDateForDueDate(startDate)
			});

			// =========================
			// RECURRING (Scheme A only)
			// =========================

			if (contract.scheme === 'A') {

				const recurringPercent = schemeARecurringPercent;

				const recurringTotal =
					tranche.amount *
					(recurringPercent / 100) *
					(split.percent / 100);

				const recurringMonths = this.getRecurringMonths(contract, tranche);
				const monthlyAmount = recurringTotal / recurringMonths;

				for (let i = 1; i <= recurringMonths; i++) {
					const dueDate = this.addMonths(startDate, i);
					// Last installment corrects rounding so sum(installments) === recurringTotal (FINANCIAL_GUARDS #9)
					const isLast = i === recurringMonths;
					const amount = isLast
						? recurringTotal - monthlyAmount * (recurringMonths - 1)
						: monthlyAmount;

					drafts.push({
						contractUid: contract.uid,
						trancheUid: tranche.uid,

						advisorUid: split.advisorUid,
						role: split.role,
						source: contract.source,
						policyUid: this.getPolicyUidForDraft(commissionPolicy),

						amount,

						installment: i + 1,

						scheme: contract.scheme,

						grossCommissionPercent,
						roleSplitPercent: split.percent,

						paymentType: 'RECURRING',

						dueDate,
						cutDate: this.getCutDateForDueDate(dueDate)
					});
				}
			}

			// =========================
			// FINAL (Scheme B only): extra by yield at month 6 or month 12 of contract
			// =========================

			if (contract.scheme === 'B') {
				const remainingPercent = grossCommissionPercent - immediatePercent;
				if (remainingPercent <= 0) return;

				const remainingAmount =
					tranche.amount *
					(remainingPercent / 100) *
					(split.percent / 100);

				const contractStart = contract.startDate ?? tranche.fundedAt!;
				const month6 = this.addMonths(contractStart, 6);
				const month12 = this.addMonths(contractStart, 12);

				const dueDate = tranche.fundedAt! < month6 ? month6 : month12;

				drafts.push({
					contractUid: contract.uid,
					trancheUid: tranche.uid,

					advisorUid: split.advisorUid,
					role: split.role,
					source: contract.source,
					policyUid: this.getPolicyUidForDraft(commissionPolicy),

					amount: remainingAmount,

					installment: 2,

					scheme: contract.scheme,

					grossCommissionPercent,
					roleSplitPercent: split.percent,

					paymentType: 'FINAL',

					dueDate,
					cutDate: this.getCutDateForDueDate(dueDate)
				});
			}

		});

		return drafts;
	}

	/**
	 * Scheme B: extra commission % by yield. 16%→+4%, 17%→+3%, 18%→+2%, 19%→+1%, 20%→+0%.
	 */
	private getSchemeBExtraPercentByYield(yieldPercent: number): number {
		const extra = 20 - yieldPercent;
		return Math.max(0, Math.min(4, extra));
	}

	private getPolicyUidForDraft(commissionPolicy?: CommissionPolicy | null): string | undefined {
		return commissionPolicy?.uid;
	}

	// =========================
	// MONTH ANNIVERSARY & RECURRING MONTHS
	// =========================

	/**
	 * For Scheme A:
	 * - Tranche 1 (inicial): siempre 12 recurrentes (abril → marzo siguiente).
	 * - Anexos (sequence > 1): recurrentes desde el mes siguiente a fundedAt hasta el mes de fin de contrato (inclusive).
	 *   Ej.: fondeado 15 jun 2026, contrato termina mar 2027 → 1 inmediato (jun) + 9 recurrentes (jul, ago, …, mar 2027).
	 */
	private getRecurringMonths(contract: Contract, tranche: Tranche): number {
		if (tranche.sequence === 1) return 12;
		const endDate = contract.endDate;
		const startDate = tranche.fundedAt!;
		if (endDate == null) return 12;

		const endYear = new Date(endDate).getUTCFullYear();
		const endMonth = new Date(endDate).getUTCMonth();

		let count = 0;
		for (let i = 1; i <= 12; i++) {
			const due = this.addMonths(startDate, i);
			const dueYear = new Date(due).getUTCFullYear();
			const dueMonth = new Date(due).getUTCMonth();
			// Incluir si el mes natural del pago es <= mes de fin de contrato (vigencia hasta ese mes inclusive).
			if (dueYear < endYear || (dueYear === endYear && dueMonth <= endMonth)) {
				count++;
			} else {
				break;
			}
		}
		return count > 0 ? count : 12;
	}

	private addMonths(timestamp: number, months: number): number {
		const base = toCanonicalMexicoDateTimestamp(timestamp) ?? timestamp;
		const date = new Date(base);
		const year = date.getUTCFullYear();
		const month = date.getUTCMonth();
		const day = date.getUTCDate();
		return Date.UTC(year, month + months, day, 12, 0, 0, 0);
	}

	/**
	 * Commission cut dates: 7 and 21 of each month.
	 * dueDate day ≤ 7 → cut day 7 of same month; ≤ 21 → cut day 21 of same month; > 21 → cut day 7 of next month.
	 */
	private getCutDateForDueDate(dueDate: number): number {
		return getCutDateForDueDateMexico(dueDate);
	}

}
