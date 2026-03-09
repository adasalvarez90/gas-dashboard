import { Tranche } from 'src/app/store/tranche/tranche.model';
import { CommissionPaymentDraft } from 'src/app/models/commission-engine.model';

/**
 * Result of registering a deposit (domain-only, no persistence).
 */
export interface RegisterDepositResult {
	updatedTranche: Tranche;
	contractActivated: boolean;
	commissionDrafts: CommissionPaymentDraft[];
}

/**
 * Result of amending tranche amount (domain-only, no persistence).
 */
export interface AmendTrancheResult {
	updatedTranche: Tranche;
	contractActivated: boolean;
	commissionDrafts: CommissionPaymentDraft[];
}
