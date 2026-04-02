import {
	CommissionPolicy,
	CommissionPolicyRule,
	CommissionSchemeCode,
	YieldConditionDto,
} from 'src/app/store/commission-policy/commission-policy.model';
import { normalizeBetweenLowHigh } from './commission-policy-yield.util';

const COMPARE_OPS = new Set(['<', '>', '<=', '>=', '=', '!=']);

function isFiniteNumber(n: unknown): n is number {
	return typeof n === 'number' && Number.isFinite(n);
}

function validateYieldCondition(cond: YieldConditionDto, path: string, errors: string[]): void {
	if (cond.type === 'compare') {
		if (!COMPARE_OPS.has(cond.operator)) {
			errors.push(`${path}: operador de rendimiento no válido`);
		}
		if (!isFiniteNumber(cond.value)) {
			errors.push(`${path}: valor de comparación inválido`);
		}
		return;
	}
	if (cond.type === 'between') {
		if (!isFiniteNumber(cond.low) || !isFiniteNumber(cond.high)) {
			errors.push(`${path}: límites BETWEEN inválidos`);
		}
		return;
	}
	errors.push(`${path}: tipo de condición de rendimiento desconocido`);
}

function normalizeRuleYieldBetween(rule: CommissionPolicyRule): CommissionPolicyRule {
	if (rule.yieldCondition?.type !== 'between') {
		return rule;
	}
	const { low, high } = normalizeBetweenLowHigh(rule.yieldCondition.low, rule.yieldCondition.high);
	return {
		...rule,
		yieldCondition: { type: 'between', low, high },
	};
}

/**
 * Collects validation messages for UI (inline + toast) without mutating the policy.
 */
export function collectCommissionPolicyValidationErrors(policy: CommissionPolicy): string[] {
	return runCommissionPolicyValidation(policy).errors;
}

function runCommissionPolicyValidation(policy: CommissionPolicy): {
	errors: string[];
	trimmedName: string;
	mergedAllowed: CommissionSchemeCode[];
	validatedRules: CommissionPolicyRule[];
} {
	const errors: string[] = [];
	const trimmedName = (policy.name ?? '').trim();
	if (!trimmedName) {
		errors.push('El nombre es obligatorio');
	}

	const allowed: CommissionSchemeCode[] =
		policy.allowedSchemes && policy.allowedSchemes.length > 0
			? [...policy.allowedSchemes]
			: policy.scheme
				? [policy.scheme]
				: [];

	if (allowed.length === 0) {
		errors.push('Debe definir al menos un esquema permitido (allowedSchemes o scheme legacy)');
	}

	const validatedRules = policy.rules ? policy.rules.map((r, i) => validateRule(r, allowed, `${i}`, errors)) : [];

	const mergedAllowed = allowed.length > 0 ? allowed : policy.scheme ? [policy.scheme] : [];

	return { errors, trimmedName, mergedAllowed, validatedRules };
}

/**
 * Returns a deep-cloned policy with BETWEEN bounds ordered (low ≤ high). Does not persist legacy-only docs beyond validation.
 */
export function validateAndNormalizeCommissionPolicy(policy: CommissionPolicy): CommissionPolicy {
	const { errors, trimmedName, mergedAllowed, validatedRules } = runCommissionPolicyValidation(policy);

	if (errors.length > 0) {
		throw new Error(errors.join('; '));
	}

	const { validFrom: _vf, validTo: _vt, ...policyWithoutLegacyWindow } = policy as CommissionPolicy;

	return {
		...policyWithoutLegacyWindow,
		name: trimmedName,
		allowedSchemes: mergedAllowed,
		rules: validatedRules.map(normalizeRuleYieldBetween),
	};
}

function validateRule(
	rule: CommissionPolicyRule,
	allowed: CommissionSchemeCode[],
	pathKey: string,
	errors: string[]
): CommissionPolicyRule {
	const path = `rules[${pathKey}]`;
	if (rule.scheme !== 'A' && rule.scheme !== 'B') {
		errors.push(`${path}: scheme inválido`);
	}
	if (allowed.length > 0 && !allowed.includes(rule.scheme)) {
		errors.push(`${path}: el scheme de la regla debe estar en allowedSchemes`);
	}
	if (!isFiniteNumber(rule.additionalPercent)) {
		errors.push(`${path}: additionalPercent inválido`);
	}
	if (rule.additionalPercent < 0) {
		errors.push(`${path}: additionalPercent no puede ser negativo`);
	}
	if (!rule.appliesToImmediate && !rule.appliesToRecurring) {
		errors.push(`${path}: debe aplicar a inmediata y/o recurrente`);
	}
	if (rule.yieldCondition != null) {
		validateYieldCondition(rule.yieldCondition, `${path}.yieldCondition`, errors);
	}
	return { ...rule, yieldCondition: rule.yieldCondition == null ? undefined : { ...rule.yieldCondition } };
}

export function assertCommissionPolicyValid(policy: CommissionPolicy): void {
	validateAndNormalizeCommissionPolicy(policy);
}
