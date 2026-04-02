import {
	normalizeBetweenLowHigh,
	yieldConditionMatches,
	YIELD_PERCENT_TOLERANCE,
} from './commission-policy-yield.util';

describe('commission-policy-yield.util', () => {
	describe('normalizeBetweenLowHigh', () => {
		it('swaps when low > high', () => {
			expect(normalizeBetweenLowHigh(18, 12)).toEqual({ low: 12, high: 18 });
		});

		it('keeps order when low <= high', () => {
			expect(normalizeBetweenLowHigh(12, 18)).toEqual({ low: 12, high: 18 });
		});
	});

	describe('yieldConditionMatches', () => {
		it('treats missing condition as match', () => {
			expect(yieldConditionMatches(15, undefined)).toBe(true);
			expect(yieldConditionMatches(15, null)).toBe(true);
		});

		it('evaluates BETWEEN inclusive', () => {
			const cond = { type: 'between' as const, low: 12, high: 14 };
			expect(yieldConditionMatches(12, cond)).toBe(true);
			expect(yieldConditionMatches(13, cond)).toBe(true);
			expect(yieldConditionMatches(14, cond)).toBe(true);
			expect(yieldConditionMatches(11.99, cond)).toBe(false);
		});

		it('uses tolerance for = and !=', () => {
			expect(
				yieldConditionMatches(13.00005, { type: 'compare', operator: '=', value: 13 })
			).toBe(true);
			expect(
				yieldConditionMatches(13.001, { type: 'compare', operator: '=', value: 13 })
			).toBe(false);
			expect(
				yieldConditionMatches(13.00005, { type: 'compare', operator: '!=', value: 13 })
			).toBe(false);
		});

		it('documents default tolerance magnitude', () => {
			expect(YIELD_PERCENT_TOLERANCE).toBe(1e-4);
		});
	});
});
