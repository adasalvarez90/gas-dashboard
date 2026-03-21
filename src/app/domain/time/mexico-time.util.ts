const MEXICO_TZ = 'America/Mexico_City';

function pad2(n: number): string {
	return n < 10 ? `0${n}` : `${n}`;
}

/** Returns YYYY-MM-DD in Mexico City timezone. */
export function mexicoDateKeyFromTimestamp(timestampMs: number): string {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: MEXICO_TZ,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
	}).formatToParts(new Date(timestampMs));

	const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
	const month = parts.find((p) => p.type === 'month')?.value ?? '01';
	const day = parts.find((p) => p.type === 'day')?.value ?? '01';
	return `${year}-${month}-${day}`;
}

/** Converts YYYY-MM-DD to a canonical timestamp (12:00 UTC) to avoid day-shift issues. */
export function mexicoDateKeyToCanonicalTimestamp(dateKey: string): number {
	const [y, m, d] = dateKey.split('-').map((x) => parseInt(x, 10));
	return Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
}

/** Normalizes date-like input (timestamp, Date, or YYYY-MM-DD) into canonical timestamp. */
export function toCanonicalMexicoDateTimestamp(input: string | number | Date | null | undefined): number | undefined {
	if (input == null || input === '') return undefined;
	if (typeof input === 'string') {
		const v = input.trim();
		if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return mexicoDateKeyToCanonicalTimestamp(v);
		const parsed = Date.parse(v);
		if (Number.isNaN(parsed)) return undefined;
		return mexicoDateKeyToCanonicalTimestamp(mexicoDateKeyFromTimestamp(parsed));
	}
	if (input instanceof Date) {
		return mexicoDateKeyToCanonicalTimestamp(mexicoDateKeyFromTimestamp(input.getTime()));
	}
	return mexicoDateKeyToCanonicalTimestamp(mexicoDateKeyFromTimestamp(input));
}

/** YYYY-MM-DD in Mexico for HTML date inputs. */
export function toMexicoDateInputValue(input: number | Date | null | undefined): string | null {
	if (input == null) return null;
	const ts = input instanceof Date ? input.getTime() : input;
	return mexicoDateKeyFromTimestamp(ts);
}

/** Adds business days using calendar dates in Mexico. */
export function addBusinessDaysMexico(fromTs: number, days: number): number {
	let [y, m, d] = mexicoDateKeyFromTimestamp(fromTs).split('-').map((x) => parseInt(x, 10));
	let cursor = Date.UTC(y, (m || 1) - 1, d || 1, 12, 0, 0, 0);
	let remaining = days;
	while (remaining > 0) {
		cursor += 24 * 60 * 60 * 1000;
		const weekday = new Date(cursor).getUTCDay();
		if (weekday !== 0 && weekday !== 6) remaining--;
	}
	return cursor;
}

/** Lexicographical compare by Mexico calendar date. */
export function isAfterMexicoDate(aTs: number, bTs: number): boolean {
	return mexicoDateKeyFromTimestamp(aTs) > mexicoDateKeyFromTimestamp(bTs);
}

/** Cut-date rule (7 / 21) from dueDate based on Mexico calendar date. */
export function getCutDateForDueDateMexico(dueDate: number): number {
	const [y, m, d] = mexicoDateKeyFromTimestamp(dueDate).split('-').map((x) => parseInt(x, 10));
	if ((d || 1) <= 7) return Date.UTC(y, (m || 1) - 1, 7, 12, 0, 0, 0);
	if ((d || 1) <= 21) return Date.UTC(y, (m || 1) - 1, 21, 12, 0, 0, 0);
	return Date.UTC(y, m || 1, 7, 12, 0, 0, 0);
}
