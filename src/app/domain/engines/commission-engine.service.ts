import { Injectable } from '@angular/core';
import { Contract } from 'src/app/store/contract/contract.model';
import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionPaymentDraft } from 'src/app/models/commission-engine.model';

@Injectable({ providedIn: 'root' })
export class CommissionEngineService {

    generateForTranche(
    contract: Contract,
    tranche: Tranche,
    roleSplits
): CommissionPaymentDraft[] {

    const drafts: CommissionPaymentDraft[] = [];

    const grossCommissionPercent =
        contract.scheme === 'A' ? 9 : 4;

    const totalCommission =
        tranche.amount * (grossCommissionPercent / 100);

    roleSplits.forEach(split => {

        const roleAmount =
            totalCommission * (split.percent / 100);

        drafts.push({
            contractUid: contract.uid,
            trancheUid: tranche.uid,

            advisorUid: split.advisorUid,
            role: split.role,
            source: contract.source,

            amount: roleAmount,

            installment: 1,

            scheme: contract.scheme,

            grossCommissionPercent: grossCommissionPercent,
            roleSplitPercent: split.percent,

            paymentType: 'IMMEDIATE',

            dueDate: tranche.fundedAt,
            cutDate: tranche.fundedAt
        });

    });

    return drafts;
}
}