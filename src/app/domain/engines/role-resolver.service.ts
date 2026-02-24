import { Injectable } from '@angular/core';
import { Contract } from 'src/app/store/contract/contract.model';
import { Advisor } from 'src/app/store/advisor/advisor.model';

@Injectable({ providedIn: 'root' })
export class RoleResolverService {

	public resolveRoleSplits(contract, configs) {

		if (!contract?.roles || !contract?.source) return [];

		const sourceConfigs = configs.filter(
			c => c.source === contract.source
		);

		const getPercent = (role: string) =>
			sourceConfigs.find(c => c.role === role)?.percentage || 0;

		const roles = contract.roles;

		const splits = [
			{ role: 'CONSULTANT', advisorUid: roles.consultant, percent: getPercent('CONSULTANT') },
			{ role: 'KAM', advisorUid: roles.kam, percent: getPercent('KAM') },
			{ role: 'MANAGER', advisorUid: roles.manager, percent: getPercent('MANAGER') },
			{ role: 'SALES_DIRECTION', advisorUid: roles.salesDirector, percent: getPercent('SALES_DIRECTION') },
			{ role: 'OPERATIONS', advisorUid: roles.operations, percent: getPercent('OPERATIONS') },
			{ role: 'CEO', advisorUid: roles.ceo, percent: getPercent('CEO') },
			{ role: 'REFERRAL', advisorUid: roles.referral, percent: getPercent('REFERRAL') }
		];

		return splits.filter(s => s.advisorUid && s.percent > 0);
	}

}