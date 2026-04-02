import { sumMatchingAdditionalPercent } from './commission-policy-dynamics.util';
import { normalizeCommissionPolicy } from './commission-policy-normalize';
import { Contract } from 'src/app/store/contract/contract.model';
import { CommissionPolicy } from 'src/app/store/commission-policy/commission-policy.model';

describe('sumMatchingAdditionalPercent', () => {
	const contractA: Contract = {
		uid: 'c1',
		scheme: 'A',
		yieldPercent: 13,
	} as Contract;

	it('sums all matching rules for immediate', () => {
		const raw: CommissionPolicy = {
			uid: 'p',
			name: 'x',
			active: true,
			validFrom: 0,
			validTo: 1,
			allowedSchemes: ['A'],
			rules: [
				{
					scheme: 'A',
					additionalPercent: 0.5,
					appliesToImmediate: true,
					appliesToRecurring: false,
				},
				{
					scheme: 'A',
					additionalPercent: 0.5,
					appliesToImmediate: true,
					appliesToRecurring: false,
				},
			],
		} as CommissionPolicy;
		const norm = normalizeCommissionPolicy(raw);
		expect(sumMatchingAdditionalPercent(norm, contractA, 'IMMEDIATE')).toBe(1);
		expect(sumMatchingAdditionalPercent(norm, contractA, 'RECURRING')).toBe(0);
	});

	it('filters by yield BETWEEN', () => {
		const raw: CommissionPolicy = {
			uid: 'p',
			name: 'x',
			active: true,
			validFrom: 0,
			validTo: 1,
			allowedSchemes: ['A'],
			rules: [
				{
					scheme: 'A',
					additionalPercent: 2,
					appliesToImmediate: true,
					appliesToRecurring: false,
					yieldCondition: { type: 'between', low: 12, high: 14 },
				},
			],
		} as CommissionPolicy;
		const norm = normalizeCommissionPolicy(raw);
		expect(sumMatchingAdditionalPercent(norm, contractA, 'IMMEDIATE')).toBe(2);
		expect(
			sumMatchingAdditionalPercent(
				norm,
				{ ...contractA, yieldPercent: 20 } as Contract,
				'IMMEDIATE'
			)
		).toBe(0);
	});
});
