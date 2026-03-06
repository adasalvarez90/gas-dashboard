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

		const grossCommissionPercent =
			contract.scheme === 'A' ? 9 : 4;

		const totalCommission =
			tranche.amount * (grossCommissionPercent / 100);

		const startDate = tranche.fundedAt;

		roleSplits.forEach(split => {

			const roleTotal =
				totalCommission * (split.percent / 100);

			// =========================
			// IMMEDIATE
			// =========================

			const immediatePercent =
				contract.scheme === 'A' ? 4 : 4;

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
				cutDate: startDate
			});

			// =========================
			// RECURRING
			// =========================

			if (contract.scheme === 'A') {

				const recurringPercent = 5;

				const recurringTotal =
					tranche.amount *
					(recurringPercent / 100) *
					(split.percent / 100);

				const monthlyAmount =
					recurringTotal / 12;

				for (let i = 1; i <= 12; i++) {

					const dueDate =
						this.addMonths(startDate, i);

					drafts.push({
						contractUid: contract.uid,
						trancheUid: tranche.uid,

						advisorUid: split.advisorUid,
						role: split.role,
						source: contract.source,

						amount: monthlyAmount,

						installment: i + 1,

						scheme: contract.scheme,

						grossCommissionPercent,
						roleSplitPercent: split.percent,

						paymentType: 'RECURRING',

						dueDate,
						cutDate: dueDate
					});

				}

			}

		});

		return drafts;
	}

	// =========================
	// MONTH ANNIVERSARY
	// =========================

	private addMonths(timestamp: number, months: number): number {

		const date = new Date(timestamp);

		const year = date.getFullYear();
		const month = date.getMonth();
		const day = date.getDate();

		const newDate = new Date(year, month + months, day);

		return newDate.getTime();
	}

}