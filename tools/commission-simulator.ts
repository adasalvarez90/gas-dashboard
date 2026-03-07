import { Contract } from '../src/app/store/contract/contract.model';
import { Tranche } from '../src/app/store/tranche/tranche.model';
import { CommissionConfig } from '../src/app/store/commission-config/commission-config.model';

import { CommissionEngineService } from '../src/app/domain/engines/commission-engine.service';
import { RoleResolverService } from '../src/app/domain/engines/role-resolver.service';

export class CommissionSimulator {

	private engine = new CommissionEngineService();
	private roleResolver = new RoleResolverService();

	simulate(
		contract: Contract,
		tranche: Tranche,
		matrix: CommissionConfig[]
	) {

		console.log('-------------------------------');
		console.log('COMMISSION SIMULATION');
		console.log('-------------------------------');

		console.log('Contract UID:', contract.uid);
		console.log('Scheme:', contract.scheme);
		console.log('Source:', contract.source);

		console.log('Tranche amount:', tranche.amount);
		console.log('Funded at:', new Date(tranche.fundedAt));

		const roleSplits =
			this.roleResolver.resolveRoleSplits(contract, matrix);

		console.log('\nRole Splits');
		console.table(roleSplits);

		const drafts =
			this.engine.generateForTranche(
				contract,
				tranche,
				roleSplits
			);

		console.log('\nGenerated Payments');
		console.table(drafts);

		const total =
			drafts.reduce((sum, p) => sum + p.amount, 0);

		console.log('\nTotal commission generated:', total);

		return drafts;
	}
}