import { Injectable } from '@angular/core';
import { Contract } from 'src/app/store/contract/contract.model';
import { Advisor } from 'src/app/store/advisor/advisor.model';

@Injectable({ providedIn: 'root' })
export class RoleResolverService {

	resolveRoleSplits(
		contract: Contract,
		advisorsDic: Record<string, Advisor>,
		matrix: any[]
	) {

		const splits: { role: string; advisorUid: string; percent: number }[] = [];

		const advisor = advisorsDic[contract.advisorUid];

		if (!advisor) return splits;

		const source = contract.source;

		const config = matrix.find(m => m.source === source);

		if (!config) return splits;

		// ==============================
		// CONSULTORA (originaria)
		// ==============================
		splits.push({
			role: 'CONSULTANT',
			advisorUid: advisor.uid,
			percent: config.consultant
		});

		// ==============================
		// GERENTE
		// ==============================
		if (advisor.managerId) {
			splits.push({
				role: 'MANAGER',
				advisorUid: advisor.managerId,
				percent: config.manager
			});
		}

		// ==============================
		// TAGS (KAM / OPERACIONES / ETC)
		// ==============================
		advisor.tags?.forEach(tag => {

			if (tag === 'KAM') {
				splits.push({
					role: 'KAM',
					advisorUid: advisor.uid,
					percent: config.kam
				});
			}

			if (tag === 'OS') {
				splits.push({
					role: 'OPERATIONS',
					advisorUid: advisor.uid,
					percent: config.operations
				});
			}

			if (tag === 'SM') {
				splits.push({
					role: 'SALES_DIRECTION',
					advisorUid: advisor.uid,
					percent: config.sales
				});
			}

		});

		// ==============================
		// CEO (buscar en advisors)
		// ==============================
		const ceo = Object.values(advisorsDic)
			.find(a => a.hierarchyLevel === 'CEO');

		if (ceo) {
			splits.push({
				role: 'CEO',
				advisorUid: ceo.uid,
				percent: config.ceo
			});
		}

		return splits;
	}
}