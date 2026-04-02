import { YieldConditionDto } from 'src/app/store/commission-policy/commission-policy.model';

/**
 * Tolerance for `=` / `!=` on `yieldPercent` (floating storage / UI decimals).
 */
export const YIELD_PERCENT_TOLERANCE = 1e-4;

function nearlyEqual(a: number, b: number): boolean {
	return Math.abs(a - b) <= YIELD_PERCENT_TOLERANCE;
}

/**
 * Normalizes BETWEEN bounds to inclusive [low, high] with low <= high.
 */
export function normalizeBetweenLowHigh(low: number, high: number): { low: number; high: number } {
	return low <= high ? { low, high } : { low: high, high: low };
}

/**
 * Evaluates a yield condition against `y` (typically `contract.yieldPercent`).
 * `undefined` / `null` condition → always true.
 */
export function yieldConditionMatches(y: number | undefined | null, condition?: YieldConditionDto | null): boolean {
	if (condition == null) {
		return true;
	}
	const yieldValue = y ?? 0;
	if (condition.type === 'between') {
		const { low, high } = normalizeBetweenLowHigh(condition.low, condition.high);
		return yieldValue >= low && yieldValue <= high;
	}
	const v = condition.value;
	switch (condition.operator) {
		case '<':
			return yieldValue < v;
		case '>':
			return yieldValue > v;
		case '<=':
			return yieldValue <= v;
		case '>=':
			return yieldValue >= v;
		case '=':
			return nearlyEqual(yieldValue, v);
		case '!=':
			return !nearlyEqual(yieldValue, v);
		default:
			return false;
	}
}
