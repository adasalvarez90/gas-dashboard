import {
	collectCommissionPolicyValidationErrors,
	validateAndNormalizeCommissionPolicy,
} from './commission-policy.validation';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';

function minimalPolicy(overrides: Partial<CommissionPolicy> = {}): CommissionPolicy {
	return {
		uid: 'x',
		name: 'N',
		active: true,
		allowedSchemes: ['A'],
		rules: [],
		...overrides,
	} as CommissionPolicy;
}

describe('collectCommissionPolicyValidationErrors', () => {
	it('returns messages without throwing', () => {
		const errs = collectCommissionPolicyValidationErrors(minimalPolicy({ name: '  ' }));
		expect(errs.length).toBeGreaterThan(0);
		expect(errs.some((e) => e.includes('nombre'))).toBe(true);
	});
});

describe('validateAndNormalizeCommissionPolicy', () => {
	it('throws when name empty', () => {
		expect(() => validateAndNormalizeCommissionPolicy(minimalPolicy({ name: '  ' }))).toThrow();
	});

	it('throws when no allowed schemes', () => {
		expect(() =>
			validateAndNormalizeCommissionPolicy(
				minimalPolicy({ allowedSchemes: [], scheme: undefined })
			)
		).toThrowError(/allowedSchemes/);
	});

	it('normalizes BETWEEN low/high order', () => {
		const out = validateAndNormalizeCommissionPolicy(
			minimalPolicy({
				rules: [
					{
						scheme: 'A',
						additionalPercent: 1,
						appliesToImmediate: true,
						appliesToRecurring: false,
						yieldCondition: { type: 'between', low: 20, high: 10 },
					},
				],
			})
		);
		expect(out.rules[0].yieldCondition).toEqual({
			type: 'between',
			low: 10,
			high: 20,
		});
	});

	it('rejects rule scheme not in allowedSchemes', () => {
		expect(() =>
			validateAndNormalizeCommissionPolicy(
				minimalPolicy({
					allowedSchemes: ['A'],
					rules: [
						{
							scheme: 'B',
							additionalPercent: 1,
							appliesToImmediate: true,
							appliesToRecurring: false,
						},
					],
				})
			)
		).toThrowError(/rules\[0\]/);
	});

	it('accepts legacy scheme when allowedSchemes omitted', () => {
		const out = validateAndNormalizeCommissionPolicy(
			minimalPolicy({
				allowedSchemes: undefined,
				scheme: 'B',
				rules: [],
			})
		);
		expect(out.allowedSchemes).toEqual(['B']);
	});
});
