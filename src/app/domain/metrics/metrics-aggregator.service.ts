import { Injectable } from '@angular/core';
import { Contract } from 'src/app/store/contract/contract.model';
import { CommissionPaymentDraft } from '../../models/commission-engine.model';
import { DashboardMetricsVM, AdvisorMetric } from '../../models/metrics.model';

@Injectable({ providedIn: 'root' })
export class MetricsAggregatorService {

	buildDashboardMetrics(
		contracts: Contract[],
		drafts: CommissionPaymentDraft[],
	): DashboardMetricsVM {

		// =============================
		// 📊 CONTRATOS
		// =============================
		const totalContracts = contracts.length;

		const signedContracts = contracts.filter(c => c.signed).length;

		const pendingContracts = totalContracts - signedContracts;

		// =============================
		// 💰 TOTAL GLOBAL
		// =============================
		const totalCommissionGlobal =
			drafts.reduce((acc, d) => acc + d.amount, 0);

		// =============================
		// 👩‍💼 AGRUPAR POR ASESORA
		// =============================
		const advisorsMap = new Map<string, AdvisorMetric>();

		drafts.forEach(d => {

			if (!advisorsMap.has(d.advisorUid)) {
				advisorsMap.set(d.advisorUid, {
					advisorUid: d.advisorUid,
					total: 0,
					contracts: []
				});
			}

			const entry = advisorsMap.get(d.advisorUid)!;

			entry.total += d.amount;

			entry.contracts.push({
				contractUid: d.contractUid,
				amount: d.amount,
				role: d.role
			});

		});

		const advisors = Array.from(advisorsMap.values());

		// =============================
		// 📄 AGRUPAR POR CONTRATO
		// =============================
		const contractMap = new Map<string, number>();

		drafts.forEach(d => {
			const current = contractMap.get(d.contractUid) || 0;
			contractMap.set(d.contractUid, current + d.amount);
		});

		const contractsMetrics = Array.from(contractMap.entries())
			.map(([contractUid, totalCommission]) => ({
				contractUid,
				totalCommission
			}));

		return {
			totalContracts,
			signedContracts,
			pendingContracts,
			totalCommissionGlobal,
			advisors,
			contracts: contractsMetrics
		};
	}

}