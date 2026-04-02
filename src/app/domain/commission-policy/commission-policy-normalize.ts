import {
	CommissionPolicy,
	CommissionPolicyRule,
	CommissionSchemeCode,
	NormalizedCommissionPolicy,
} from 'src/app/store/commission-policy/commission-policy.model';

const BASE_A_IMMEDIATE = 4;
const BASE_A_RECURRING = 5;

/**
 * Builds a canonical view for the engine: `allowedSchemes` + `rules`, including legacy override fields.
 */
export function normalizeCommissionPolicy(policy: CommissionPolicy): NormalizedCommissionPolicy {
	const allowedSchemes = resolveAllowedSchemes(policy);
	let rules: CommissionPolicyRule[] =
		policy.rules && policy.rules.length > 0 ? policy.rules.map(cloneRule) : [];

	if (rules.length === 0 && hasLegacyOverrides(policy)) {
		rules = legacyRulesFromOverrides(policy);
	}

	return {
		...policy,
		allowedSchemes,
		rules,
	};
}

function resolveAllowedSchemes(policy: CommissionPolicy): CommissionSchemeCode[] {
	if (policy.allowedSchemes && policy.allowedSchemes.length > 0) {
		return [...policy.allowedSchemes];
	}
	if (policy.scheme) {
		return [policy.scheme];
	}
	return [];
}

function hasLegacyOverrides(policy: CommissionPolicy): boolean {
	return (
		policy.overrideImmediatePercent != null || policy.overrideTotalCommissionPercent != null
	);
}

function legacyRulesFromOverrides(policy: CommissionPolicy): CommissionPolicyRule[] {
	const scheme: CommissionSchemeCode = policy.scheme ?? 'A';
	let immediatePercent: number;
	if (policy.overrideImmediatePercent != null) {
		immediatePercent = policy.overrideImmediatePercent;
	} else if (policy.overrideTotalCommissionPercent != null) {
		immediatePercent = policy.overrideTotalCommissionPercent - BASE_A_RECURRING;
	} else {
		return [];
	}
	const additional = immediatePercent - BASE_A_IMMEDIATE;
	if (additional === 0) {
		return [];
	}
	return [
		{
			scheme,
			additionalPercent: additional,
			appliesToImmediate: true,
			appliesToRecurring: false,
		},
	];
}

function cloneRule(r: CommissionPolicyRule): CommissionPolicyRule {
	return {
		scheme: r.scheme,
		additionalPercent: r.additionalPercent,
		appliesToImmediate: r.appliesToImmediate,
		appliesToRecurring: r.appliesToRecurring,
		yieldCondition: r.yieldCondition == null ? undefined : { ...r.yieldCondition },
	};
}
