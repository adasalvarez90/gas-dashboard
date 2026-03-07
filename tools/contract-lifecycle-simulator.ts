import { Contract } from '../src/app/store/contract/contract.model';
import { Tranche } from '../src/app/store/tranche/tranche.model';
import { CommissionConfig } from '../src/app/store/commission-config/commission-config.model';

import { CommissionEngineService } from '../src/app/domain/engines/commission-engine.service';
import { RoleResolverService } from '../src/app/domain/engines/role-resolver.service';

export class ContractLifecycleSimulator {

    private engine = new CommissionEngineService();
    private roleResolver = new RoleResolverService();

    simulateContract(
        contract: Contract,
        tranches: Tranche[],
        matrix: CommissionConfig[]
    ) {

        console.log('==============================');
        console.log('CONTRACT LIFECYCLE SIMULATION');
        console.log('==============================');

        console.log('Contract UID:', contract.uid);
        console.log('Scheme:', contract.scheme);
        console.log('Source:', contract.source);

        const roleSplits =
            this.roleResolver.resolveRoleSplits(contract, matrix);

        console.log('\nRole Distribution');
        console.table(roleSplits);

        let allPayments: any[] = [];

        tranches.forEach(tranche => {

            console.log('\n------------------------------');
            console.log('TRANCHE', tranche.sequence);
            console.log('Amount:', tranche.amount);
            console.log('Funded At:', new Date(tranche.fundedAt));

            const drafts =
                this.engine.generateForTranche(
                    contract,
                    tranche,
                    roleSplits
                );

            console.table(drafts);

            allPayments = [...allPayments, ...drafts];

        });

        console.log('\n==============================');
        console.log('GLOBAL PAYMENT SCHEDULE');
        console.log('==============================');

        console.table(allPayments);

        const totalsByAdvisor: Record<string, number> = {};

        allPayments.forEach(p => {

            if (!totalsByAdvisor[p.advisorUid]) {
                totalsByAdvisor[p.advisorUid] = 0;
            }

            totalsByAdvisor[p.advisorUid] += p.amount;

        });

        console.log('\nTOTAL COMMISSIONS BY ADVISOR');

        console.table(
            Object.entries(totalsByAdvisor).map(([advisor, amount]) => ({
                advisor,
                amount
            }))
        );

        const totalCommission =
            allPayments.reduce((sum, p) => sum + p.amount, 0);

        console.log('\nTOTAL COMMISSION GENERATED:', totalCommission);

        return allPayments;
    }

}