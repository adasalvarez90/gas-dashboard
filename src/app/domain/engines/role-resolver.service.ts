import { Injectable } from '@angular/core';
import { Contract } from 'src/app/store/contract/contract.model';
import { Advisor } from 'src/app/store/advisor/advisor.model';

@Injectable({ providedIn: 'root' })
export class RoleResolverService {

	resolve = {
		CONSULTANT: 'CONSULTANT',
		MANAGER: 'MANAGER',
		CEO: 'CEO',
		KAM: 'KAM',
		OPERATIONS: 'OPERATIONS',
		SALES: 'SALES_DIRECTION'
	};

	resolveRoleSplits(
		contract: Contract,
		advisorsDic: Record<string, Advisor>,
		matrix: any[]
	) {

		const splits: {
			role: string;
			advisorUid: string;
			percent: number;
		}[] = [];

		const advisor = advisorsDic[contract.advisorUid];

		if (!advisor) return splits;

		// 🔥 BUSCAR CONFIG SEGÚN SOURCE
		const config = matrix.find(m => m.source === contract.source);

		if (!config) return splits;

		// =========================
		// 👩‍💼 CONSULTORA ORIGINARIA
		// =========================
		splits.push({
			role: this.Roles.CONSULTANT,
			advisorUid: advisor.uid,
			percent: config.consultant
		});

		// =========================
		// 👩‍💼 GERENTE
		// =========================
		if (advisor.managerId) {
			splits.push({
				role: this.Roles.MANAGER,
				advisorUid: advisor.managerId,
				percent: config.manager
			});
		}

		// =========================
		// 🏷️ TAGS
		// =========================
		advisor.tags?.forEach(tag => {

			if (tag === 'KAM') {
				splits.push({
					role: this.Roles.KAM,
					advisorUid: advisor.uid,
					percent: config.kam
				});
			}

			if (tag === 'OS') {
				splits.push({
					role: this.Roles.OPERATIONS,
					advisorUid: advisor.uid,
					percent: config.operations
				});
			}

			if (tag === 'SM') {
				splits.push({
					role: this.Roles.SALES,
					advisorUid: advisor.uid,
					percent: config.sales
				});
			}

		});

		// =========================
		// 👑 CEO GLOBAL
		// =========================
		const ceo = Object.values(advisorsDic)
			.find(a => a.hierarchyLevel === 'CEO');

		if (ceo) {
			splits.push({
				role: this.Roles.CEO,
				advisorUid: ceo.uid,
				percent: config.ceo
			});
		}

		return splits;
	}

	private Roles = {
		CONSULTANT: 'CONSULTANT',
		MANAGER: 'MANAGER',
		CEO: 'CEO',
		KAM: 'KAM',
		OPERATIONS: 'OPERATIONS',
		SALES: 'SALES_DIRECTION'
	};

}