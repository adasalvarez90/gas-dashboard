import { Injectable } from '@angular/core';
import { Contract } from '../../store/contract/contract.model';
import { Tranche } from '../../store/tranche/tranche.model';
import { CommissionPaymentDraft } from '../../models/commission-engine.model';

@Injectable({ providedIn: 'root' })
export class CommissionEngineService {

	generateForTranche(
		contract: Contract,
		tranche: Tranche,
		roleSplits
	): CommissionPaymentDraft[] {

		if (!tranche.fundedAt) return [];

		const drafts: CommissionPaymentDraft[] = [];

		const grossCommissionPercent = contract.scheme === 'A'
			? 9
			: 4 + this.getSchemeBExtraPercentByYield(contract.yieldPercent ?? 20);

		const totalCommission =
			tranche.amount * (grossCommissionPercent / 100);

		const startDate = tranche.fundedAt;

		roleSplits.forEach(split => {

			const roleTotal =
				totalCommission * (split.percent / 100);

			// =========================
			// IMMEDIATE (4% both schemes)
			// =========================

			const immediatePercent = 4;

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

				const recurringPercent = 5;

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

	// =========================
	// MONTH ANNIVERSARY & RECURRING MONTHS
	// =========================

	/**
	 * For Scheme A: initial tranche = 12 months; annex = months from fundedAt to contract.endDate.
	 */
	private getRecurringMonths(contract: Contract, tranche: Tranche): number {
		if (tranche.sequence === 1) return 12;
		const endDate = contract.endDate;
		const startDate = tranche.fundedAt!;
		if (endDate == null || startDate >= endDate) return 12;
		let count = 0;
		for (let i = 1; i <= 12; i++) {
			const due = this.addMonths(startDate, i);
			if (due <= endDate) count++;
			else break;
		}
		return count > 0 ? count : 12;
	}

	private addMonths(timestamp: number, months: number): number {

		const date = new Date(timestamp);

		const year = date.getFullYear();
		const month = date.getMonth();
		const day = date.getDate();

		const newDate = new Date(year, month + months, day);

		return newDate.getTime();
	}

	/**
	 * Commission cut dates: 7 and 21 of each month.
	 * dueDate day ≤ 7 → cut day 7 of same month; ≤ 21 → cut day 21 of same month; > 21 → cut day 7 of next month.
	 */
	private getCutDateForDueDate(dueDate: number): number {
		const d = new Date(dueDate);
		const year = d.getFullYear();
		const month = d.getMonth();
		const day = d.getDate();

		if (day <= 7) {
			return new Date(year, month, 7).getTime();
		}
		if (day <= 21) {
			return new Date(year, month, 21).getTime();
		}
		return new Date(year, month + 1, 7).getTime();
	}

}