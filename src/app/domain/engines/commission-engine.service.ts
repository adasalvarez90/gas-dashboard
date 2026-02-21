import { Injectable } from '@angular/core';
import { Contract } from '../../store/contract/contract.model';
import { CommissionPaymentDraft } from '../../models/commission-engine.model';

@Injectable({ providedIn: 'root' })
export class CommissionEngineService {

	private CUT_DAYS = [7, 21];

	// ================================
	// 🎯 ENTRY POINT PRINCIPAL
	// ================================
	generatePayments(
		contract: Contract,
		roleSplits: { role: string; advisorUid: string; percent: number }[],
	): CommissionPaymentDraft[] {

		if (!contract.fullyFundedAt) return [];

		const totalCommissionPercent = this.getTotalCommissionPercent(contract);

		const totalCommissionAmount =
			contract.capitalMXN * (totalCommissionPercent / 100);

		const installments = this.getInstallmentPlan(contract);

		const payments: CommissionPaymentDraft[] = [];

		roleSplits.forEach(split => {

			const advisorAmount =
				totalCommissionAmount * (split.percent / 100);

			installments.forEach(inst => {

				payments.push({
					contractUid: contract.uid,
					advisorUid: split.advisorUid,
					role: split.role,
					source: contract.source,
					scheme: contract.scheme,
					installment: inst.index,
					cutDate: this.resolveCutDate(contract.fullyFundedAt!, inst.offset),
					amount: advisorAmount * inst.percent,
				});

			});

		});

		return payments;
	}

	// ================================
	// 🧮 ESQUEMA A / B
	// ================================
	private getTotalCommissionPercent(contract: Contract): number {

		if (contract.scheme === 'A') {
			return 9;
		}

		if (contract.scheme === 'B') {
			const base = 4;
			const y = contract.yieldPercent;

			if (y === 16) return base + 4;
			if (y === 17) return base + 3;
			if (y === 18) return base + 2;
			if (y === 19) return base + 1;
			if (y === 20) return base;

			return base;
		}

		return 0;
	}

	// ================================
	// 📆 PLAN DE PAGOS
	// ================================
	private getInstallmentPlan(contract: Contract) {

		if (contract.scheme === 'A') {
			return [
				{ index: 1, percent: 4 / 9, offset: 0 },
				...Array.from({ length: 12 }).map((_, i) => ({
					index: i + 2,
					percent: (5 / 9) / 12,
					offset: i + 1,
				}))
			];
		}

		if (contract.scheme === 'B') {

			const total = this.getTotalCommissionPercent(contract);
			const extra = total - 4;

			return [
				{ index: 1, percent: 4 / total, offset: 0 },
				{ index: 2, percent: extra / total, offset: 6 },
			];
		}

		return [];
	}

	// ================================
	// 📅 RESOLVER CORTE (7 o 21)
	// ================================
	private resolveCutDate(start: number, monthOffset: number): number {

		const base = new Date(start);

		base.setMonth(base.getMonth() + monthOffset);

		const day = base.getDate();

		const cutDay = day <= 7
			? 7
			: day <= 21
				? 21
				: 7;

		if (cutDay === 7 && day > 21) {
			base.setMonth(base.getMonth() + 1);
		}

		base.setDate(cutDay);

		return base.getTime();
	}

}