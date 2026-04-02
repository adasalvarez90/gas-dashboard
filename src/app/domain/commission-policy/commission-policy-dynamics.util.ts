import { Contract } from 'src/app/store/contract/contract.model';
import {
	CommissionPolicyRule,
	NormalizedCommissionPolicy,
} from 'src/app/store/commission-policy/commission-policy.model';
import { CommissionPaymentDraft } from 'src/app/models/commission-engine.model';
import { yieldConditionMatches } from './commission-policy-yield.util';

export type CommissionLinePaymentType = CommissionPaymentDraft['paymentType'];

function ruleMatchesPaymentType(rule: CommissionPolicyRule, paymentType: CommissionLinePaymentType): boolean {
	if (paymentType === 'IMMEDIATE') {
		return rule.appliesToImmediate;
	}
	if (paymentType === 'RECURRING') {
		return rule.appliesToRecurring;
	}
	return false;
}

/**
 * Sums `additionalPercent` for all rules that match contract scheme, payment line type, and optional yield condition.
 * `FINAL` (Scheme B lump) does not receive RECURRING/IMMEDIATE flags unless extended later.
 */
export function sumMatchingAdditionalPercent(
	policy: NormalizedCommissionPolicy,
	contract: Contract,
	paymentType: CommissionLinePaymentType
): number {
	const y = contract.yieldPercent;
	let sum = 0;
	for (const rule of policy.rules) {
		if (rule.scheme !== contract.scheme) {
			continue;
		}
		if (!ruleMatchesPaymentType(rule, paymentType)) {
			continue;
		}
		if (!yieldConditionMatches(y, rule.yieldCondition)) {
			continue;
		}
		sum += rule.additionalPercent;
	}
	return sum;
}
